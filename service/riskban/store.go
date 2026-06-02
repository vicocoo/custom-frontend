package riskban

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Store struct {
	db *gorm.DB
}

func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Available() bool {
	return s != nil && s.db != nil
}

func (s *Store) Ping() error {
	if !s.Available() {
		return fmt.Errorf("risk audit store is unavailable")
	}
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

func migrateAuditDB(db *gorm.DB) error {
	return db.AutoMigrate(&Settings{}, &Event{}, &Action{})
}

func OpenAuditDB(dsn string) (*gorm.DB, error) {
	dsn = strings.TrimSpace(dsn)
	if dsn == "" {
		return nil, fmt.Errorf("empty risk audit dsn")
	}
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		return gorm.Open(postgres.New(postgres.Config{
			DSN:                  dsn,
			PreferSimpleProtocol: true,
		}), &gorm.Config{PrepareStmt: true})
	}
	if strings.HasPrefix(dsn, "sqlite://") {
		return gorm.Open(sqlite.Open(strings.TrimPrefix(dsn, "sqlite://")), &gorm.Config{PrepareStmt: true})
	}
	if strings.HasPrefix(dsn, "file:") || strings.HasPrefix(dsn, "local") {
		path := dsn
		if strings.HasPrefix(dsn, "local") {
			path = strings.TrimSpace(strings.TrimPrefix(dsn, "local"))
			if path == "" {
				path = "risk-audit.db"
			}
		}
		return gorm.Open(sqlite.Open(path), &gorm.Config{PrepareStmt: true})
	}
	if !strings.Contains(dsn, "parseTime") {
		if strings.Contains(dsn, "?") {
			dsn += "&parseTime=true"
		} else {
			dsn += "?parseTime=true"
		}
	}
	return gorm.Open(mysql.Open(dsn), &gorm.Config{PrepareStmt: true})
}

func InitFromEnv() error {
	dsn := strings.TrimSpace(common.GetEnvOrDefaultString("RISK_AUDIT_SQL_DSN", ""))
	sqlitePath := strings.TrimSpace(common.GetEnvOrDefaultString("RISK_AUDIT_SQLITE_PATH", ""))
	if dsn == "" && sqlitePath == "" {
		setSettingsSnapshot(nil)
		SetStore(nil)
		common.SysLog("risk ban audit database is not configured; feature remains unavailable")
		return nil
	}
	if dsn == "" {
		dsn = "sqlite://" + sqlitePath
	}
	db, err := OpenAuditDB(dsn)
	if err != nil {
		setSettingsSnapshot(nil)
		SetStore(nil)
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	sqlDB.SetMaxIdleConns(common.GetEnvOrDefault("RISK_AUDIT_SQL_MAX_IDLE_CONNS", 10))
	sqlDB.SetMaxOpenConns(common.GetEnvOrDefault("RISK_AUDIT_SQL_MAX_OPEN_CONNS", 100))
	sqlDB.SetConnMaxLifetime(time.Second * time.Duration(common.GetEnvOrDefault("RISK_AUDIT_SQL_MAX_LIFETIME", 60)))

	if common.IsMasterNode {
		if err := migrateAuditDB(db); err != nil {
			setSettingsSnapshot(nil)
			SetStore(nil)
			return err
		}
	}
	store := NewStore(db)
	SetStore(store)
	settings, err := store.EnsureSettings()
	if err != nil {
		setSettingsSnapshot(nil)
		return err
	}
	setSettingsSnapshot(&settings)
	common.SysLog("risk ban audit database initialized")
	return nil
}

func (s *Store) EnsureSettings() (Settings, error) {
	settings, err := s.LoadSettings()
	if err == nil {
		return settings, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return Settings{}, err
	}
	defaults := DefaultSettings()
	defaults.ID = 1
	if err := s.db.Create(&defaults).Error; err != nil {
		return Settings{}, err
	}
	return defaults, nil
}

func (s *Store) LoadSettings() (Settings, error) {
	if !s.Available() {
		return Settings{}, fmt.Errorf("risk audit store is unavailable")
	}
	var settings Settings
	err := s.db.Order("id asc").First(&settings).Error
	if err != nil {
		return Settings{}, err
	}
	return normalizeSettings(settings), nil
}

func (s *Store) SaveSettings(settings Settings) (Settings, error) {
	if !s.Available() {
		return Settings{}, fmt.Errorf("risk audit store is unavailable")
	}
	settings = normalizeSettings(settings)
	current, err := s.EnsureSettings()
	if err != nil {
		return Settings{}, err
	}
	settings.ID = current.ID
	if err := s.db.Model(&Settings{}).Where("id = ?", current.ID).Updates(map[string]any{
		"enabled":              settings.Enabled,
		"window_seconds":       settings.WindowSeconds,
		"threshold":            settings.Threshold,
		"block_message_prefix": settings.BlockMessagePrefix,
		"input_max_chars":      settings.InputMaxChars,
		"admin_api_enabled":    settings.AdminAPIEnabled,
	}).Error; err != nil {
		return Settings{}, err
	}
	return s.LoadSettings()
}

func (s *Store) InsertEvent(event *Event) (created bool, existing *Event, err error) {
	if !s.Available() {
		return false, nil, fmt.Errorf("risk audit store is unavailable")
	}
	var found Event
	findErr := s.db.Where("user_id = ? AND dedupe_key = ?", event.UserID, event.DedupeKey).First(&found).Error
	if findErr == nil {
		return false, &found, nil
	}
	if !errors.Is(findErr, gorm.ErrRecordNotFound) {
		return false, nil, findErr
	}
	if event.CreatedAt == 0 {
		event.CreatedAt = time.Now().Unix()
	}
	if err := s.db.Create(event).Error; err != nil {
		var duplicate Event
		if isDuplicateKeyError(err) {
			if queryErr := s.db.Where("user_id = ? AND dedupe_key = ?", event.UserID, event.DedupeKey).First(&duplicate).Error; queryErr == nil {
				return false, &duplicate, nil
			}
		}
		return false, nil, err
	}
	return true, event, nil
}

func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") ||
		strings.Contains(msg, "duplicated") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "unique index")
}

func (s *Store) CountUserEventsSince(userID int, since int64) (int64, error) {
	var count int64
	err := s.db.Model(&Event{}).Where("user_id = ? AND created_at >= ?", userID, since).Count(&count).Error
	return count, err
}

func (s *Store) MarkEventBanTriggered(eventID uint) error {
	if eventID == 0 {
		return nil
	}
	return s.db.Model(&Event{}).Where("id = ?", eventID).Update("ban_triggered", true).Error
}

func (s *Store) InsertActionIfMissing(action *Action) (bool, error) {
	if !s.Available() {
		return false, fmt.Errorf("risk audit store is unavailable")
	}
	if action.CreatedAt == 0 {
		action.CreatedAt = time.Now().Unix()
	}
	var existing Action
	err := s.db.Where(
		"user_id = ? AND action = ? AND window_start = ? AND window_end = ?",
		action.UserID, action.Action, action.WindowStart, action.WindowEnd,
	).First(&existing).Error
	if err == nil {
		return false, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}
	return true, s.db.Create(action).Error
}

func ListEvents(query EventQuery) ([]Event, int64, error) {
	store := getStore()
	if store == nil || store.db == nil {
		return nil, 0, fmt.Errorf("risk audit store is unavailable")
	}
	limit := normalizeLimit(query.Limit)
	db := store.db.Model(&Event{})
	db = applyEventFilters(db, query.UserID, query.StartTime, query.EndTime)
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var events []Event
	err := db.Order("id desc").Offset(nonNegativeOffset(query.Offset)).Limit(limit).Find(&events).Error
	return events, total, err
}

func ListActions(query ActionQuery) ([]Action, int64, error) {
	store := getStore()
	if store == nil || store.db == nil {
		return nil, 0, fmt.Errorf("risk audit store is unavailable")
	}
	limit := normalizeLimit(query.Limit)
	db := store.db.Model(&Action{})
	db = applyActionFilters(db, query.UserID, query.StartTime, query.EndTime)
	if query.Action != "" {
		db = db.Where("action = ?", query.Action)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var actions []Action
	err := db.Order("id desc").Offset(nonNegativeOffset(query.Offset)).Limit(limit).Find(&actions).Error
	return actions, total, err
}

func ListBannedUsers(offset int, limit int) ([]BannedUser, int64, error) {
	actions, total, err := ListActions(ActionQuery{
		Action: ActionAutoBan,
		Offset: offset,
		Limit:  limit,
	})
	if err != nil {
		return nil, 0, err
	}
	users := make([]BannedUser, 0, len(actions))
	for _, action := range actions {
		item := BannedUser{
			UserID:     action.UserID,
			BannedAt:   action.CreatedAt,
			EventCount: action.EventCount,
			ActionID:   action.ID,
		}
		user, userErr := model.GetUserById(action.UserID, false)
		if userErr == nil && user != nil {
			item.Username = user.Username
			item.DisplayName = user.DisplayName
			item.Status = user.Status
		}
		users = append(users, item)
	}
	return users, total, nil
}

func ClearEvents(clear EventClearQuery, operatorID int, operatorType string) (int64, error) {
	store := getStore()
	if store == nil || store.db == nil {
		return 0, fmt.Errorf("risk audit store is unavailable")
	}
	actionName := ActionClearAllEvents
	if clear.UserID > 0 {
		actionName = ActionClearUserEvents
	}
	db := applyEventFilters(store.db.Model(&Event{}), clear.UserID, clear.StartTime, clear.EndTime)
	if !hasEventClearFilters(clear) {
		db = db.Where("1 = 1")
	}
	result := db.Delete(&Event{})
	if result.Error != nil {
		return 0, result.Error
	}
	action := &Action{
		UserID:         clear.UserID,
		Action:         actionName,
		Reason:         clearReason("clear risk ban audit events", clear.StartTime, clear.EndTime),
		OperatorUserID: operatorID,
		OperatorType:   operatorType,
		EventCount:     int(result.RowsAffected),
		WindowStart:    clear.StartTime,
		WindowEnd:      clearEndTime(clear.EndTime),
	}
	_, err := store.InsertActionIfMissing(action)
	return result.RowsAffected, err
}

func ClearUserActions(userID int, operatorID int, operatorType string) (int64, error) {
	return ClearActions(ActionClearQuery{UserID: userID}, operatorID, operatorType)
}

func ClearActions(clear ActionClearQuery, operatorID int, operatorType string) (int64, error) {
	store := getStore()
	if store == nil || store.db == nil {
		return 0, fmt.Errorf("risk audit store is unavailable")
	}
	db := applyActionFilters(store.db.Model(&Action{}), clear.UserID, clear.StartTime, clear.EndTime)
	if !hasActionClearFilters(clear) {
		db = db.Where("1 = 1")
	}
	result := db.Delete(&Action{})
	if result.Error != nil {
		return 0, result.Error
	}
	action := &Action{
		UserID:         clear.UserID,
		Action:         ActionClearBanRecords,
		Reason:         clearReason("clear risk ban action records", clear.StartTime, clear.EndTime),
		OperatorUserID: operatorID,
		OperatorType:   operatorType,
		EventCount:     int(result.RowsAffected),
		WindowStart:    clear.StartTime,
		WindowEnd:      clearEndTime(clear.EndTime),
	}
	_, err := store.InsertActionIfMissing(action)
	return result.RowsAffected, err
}

func applyEventFilters(db *gorm.DB, userID int, startTime int64, endTime int64) *gorm.DB {
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	}
	if startTime > 0 {
		db = db.Where("created_at >= ?", startTime)
	}
	if endTime > 0 {
		db = db.Where("created_at <= ?", endTime)
	}
	return db
}

func applyActionFilters(db *gorm.DB, userID int, startTime int64, endTime int64) *gorm.DB {
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	}
	if startTime > 0 {
		db = db.Where("created_at >= ?", startTime)
	}
	if endTime > 0 {
		db = db.Where("created_at <= ?", endTime)
	}
	return db
}

func hasEventClearFilters(clear EventClearQuery) bool {
	return clear.UserID > 0 || clear.StartTime > 0 || clear.EndTime > 0
}

func hasActionClearFilters(clear ActionClearQuery) bool {
	return clear.UserID > 0 || clear.StartTime > 0 || clear.EndTime > 0
}

func clearReason(base string, startTime int64, endTime int64) string {
	switch {
	case startTime > 0 && endTime > 0:
		return fmt.Sprintf("%s from %d to %d", base, startTime, endTime)
	case startTime > 0:
		return fmt.Sprintf("%s from %d", base, startTime)
	case endTime > 0:
		return fmt.Sprintf("%s until %d", base, endTime)
	default:
		return base
	}
}

func clearEndTime(endTime int64) int64 {
	if endTime > 0 {
		return endTime
	}
	return time.Now().Unix()
}

func normalizeLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func nonNegativeOffset(offset int) int {
	if offset < 0 {
		return 0
	}
	return offset
}
