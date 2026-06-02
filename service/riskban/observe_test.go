package riskban

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupRiskBanTestDB(t *testing.T) {
	t.Helper()
	mainDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open main db: %v", err)
	}
	if err := mainDB.AutoMigrate(&model.User{}, &model.Token{}, &model.Channel{}); err != nil {
		t.Fatalf("migrate main db: %v", err)
	}
	auditDB, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open audit db: %v", err)
	}
	if err := migrateAuditDB(auditDB); err != nil {
		t.Fatalf("migrate audit db: %v", err)
	}

	origMainDB := model.DB
	origRedis := common.RedisEnabled
	t.Cleanup(func() {
		model.DB = origMainDB
		common.RedisEnabled = origRedis
		SetStoreForTest(nil)
		SetSettingsSnapshotForTest(nil)
	})

	model.DB = mainDB
	common.RedisEnabled = false
	SetStoreForTest(NewStore(auditDB))
	SetSettingsSnapshotForTest(&Settings{
		Enabled:            true,
		WindowSeconds:      3600,
		Threshold:          2,
		BlockMessagePrefix: "risk audit blocked",
		InputMaxChars:      12000,
		AdminAPIEnabled:    true,
	})
}

func newRiskBanContext(t *testing.T, requestID string, body string) (*gin.Context, *relaycommon.RelayInfo, *types.NewAPIError) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	req := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = req
	c.Set(common.RequestIdKey, requestID)
	storage, err := common.CreateBodyStorage([]byte(body))
	if err != nil {
		t.Fatalf("create body storage: %v", err)
	}
	c.Set(common.KeyBodyStorage, storage)

	info := &relaycommon.RelayInfo{
		UserId:          1,
		TokenId:         7,
		RelayFormat:     types.RelayFormatOpenAI,
		RelayMode:       relayconstant.RelayModeChatCompletions,
		OriginModelName: "gpt-test",
		RequestURLPath:  "/v1/chat/completions",
		RequestId:       requestID,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelId:   11,
			ChannelType: 1,
		},
	}
	errResp := types.NewOpenAIError(
		errors.New("risk audit blocked: unsafe prompt"),
		types.ErrorCodeBadResponseStatusCode,
		http.StatusForbidden,
	)
	return c, info, errResp
}

func TestObserveRelayErrorDedupesRequestAndDisablesUserAtThreshold(t *testing.T) {
	setupRiskBanTestDB(t)
	if err := model.DB.Create(&model.User{Id: 1, Username: "alice", Role: common.RoleCommonUser, Status: common.UserStatusEnabled}).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	body := `{"messages":[{"role":"user","content":"unsafe"}]}`
	c1, info1, errResp := newRiskBanContext(t, "req-1", body)
	first := ObserveRelayError(c1, info1, errResp)
	if !first.Matched || !first.Recorded {
		t.Fatalf("expected first event to match and record, got %+v", first)
	}
	duplicate := ObserveRelayError(c1, info1, errResp)
	if !duplicate.Matched || duplicate.Recorded || !duplicate.Duplicate {
		t.Fatalf("expected duplicate observe to skip recording/counting, got %+v", duplicate)
	}
	user, err := model.GetUserById(1, true)
	if err != nil {
		t.Fatalf("get user after first event: %v", err)
	}
	if user.Status != common.UserStatusEnabled {
		t.Fatalf("user should still be enabled after one event, got status %d", user.Status)
	}

	c2, info2, errResp2 := newRiskBanContext(t, "req-2", body)
	second := ObserveRelayError(c2, info2, errResp2)
	if !second.Matched || !second.Recorded || !second.BanTriggered {
		t.Fatalf("expected second event to trigger ban, got %+v", second)
	}
	user, err = model.GetUserById(1, true)
	if err != nil {
		t.Fatalf("get user after second event: %v", err)
	}
	if user.Status != common.UserStatusDisabled {
		t.Fatalf("expected user disabled at threshold, got status %d", user.Status)
	}
	events, _, err := ListEvents(EventQuery{UserID: 1, Limit: 10})
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if len(events) == 0 || events[0].MatchedPrefix != "risk audit blocked" {
		t.Fatalf("expected event to store matched prefix, got %+v", events)
	}
}

func TestObserveRelayErrorDoesNotDisableRootUser(t *testing.T) {
	setupRiskBanTestDB(t)
	if err := model.DB.Create(&model.User{Id: 1, Username: "root", Role: common.RoleRootUser, Status: common.UserStatusEnabled}).Error; err != nil {
		t.Fatalf("create root user: %v", err)
	}
	body := `{"messages":[{"role":"user","content":"unsafe"}]}`

	c1, info1, errResp1 := newRiskBanContext(t, "root-1", body)
	_ = ObserveRelayError(c1, info1, errResp1)
	c2, info2, errResp2 := newRiskBanContext(t, "root-2", body)
	result := ObserveRelayError(c2, info2, errResp2)
	if result.BanTriggered {
		t.Fatalf("root user must not be auto-disabled")
	}
	user, err := model.GetUserById(1, true)
	if err != nil {
		t.Fatalf("get root user: %v", err)
	}
	if user.Status != common.UserStatusEnabled {
		t.Fatalf("root user should remain enabled, got status %d", user.Status)
	}

	actions, total, err := ListActions(ActionQuery{UserID: 1, Limit: 10})
	if err != nil {
		t.Fatalf("list actions: %v", err)
	}
	if total != 1 || actions[0].Action != ActionAutoBanSkipped || actions[0].CreatedAt == 0 {
		t.Fatalf("expected one skipped action, got total=%d actions=%+v", total, actions)
	}
	if time.Unix(actions[0].CreatedAt, 0).IsZero() {
		t.Fatalf("expected action timestamp")
	}
}

func TestRiskBanStoreFiltersAndClearsByTimeRange(t *testing.T) {
	setupRiskBanTestDB(t)
	store := getStore()
	if store == nil {
		t.Fatalf("expected test store")
	}
	for _, event := range []Event{
		{UserID: 1, DedupeKey: "old", CreatedAt: 100},
		{UserID: 1, DedupeKey: "mid", CreatedAt: 200},
		{UserID: 2, DedupeKey: "new", CreatedAt: 300},
	} {
		if _, _, err := store.InsertEvent(&event); err != nil {
			t.Fatalf("insert event: %v", err)
		}
	}
	for _, action := range []Action{
		{UserID: 1, Action: ActionAutoBan, WindowStart: 90, WindowEnd: 100, CreatedAt: 100},
		{UserID: 1, Action: ActionAutoBan, WindowStart: 190, WindowEnd: 200, CreatedAt: 200},
		{UserID: 2, Action: ActionAutoBan, WindowStart: 290, WindowEnd: 300, CreatedAt: 300},
	} {
		if _, err := store.InsertActionIfMissing(&action); err != nil {
			t.Fatalf("insert action: %v", err)
		}
	}

	events, total, err := ListEvents(EventQuery{UserID: 1, StartTime: 150, EndTime: 250, Limit: 10})
	if err != nil {
		t.Fatalf("list filtered events: %v", err)
	}
	if total != 1 || len(events) != 1 || events[0].DedupeKey != "mid" {
		t.Fatalf("expected only mid event, total=%d events=%+v", total, events)
	}

	actions, total, err := ListActions(ActionQuery{UserID: 1, StartTime: 150, EndTime: 250, Limit: 10})
	if err != nil {
		t.Fatalf("list filtered actions: %v", err)
	}
	if total != 1 || len(actions) != 1 || actions[0].CreatedAt != 200 {
		t.Fatalf("expected only mid action, total=%d actions=%+v", total, actions)
	}

	deleted, err := ClearEvents(EventClearQuery{UserID: 1, StartTime: 150, EndTime: 250}, 99, OperatorRoot)
	if err != nil {
		t.Fatalf("clear events: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("expected one event deleted, got %d", deleted)
	}
	events, total, err = ListEvents(EventQuery{UserID: 1, Limit: 10})
	if err != nil {
		t.Fatalf("list remaining events: %v", err)
	}
	if total != 1 || len(events) != 1 || events[0].DedupeKey != "old" {
		t.Fatalf("expected only old user event left, total=%d events=%+v", total, events)
	}

	deleted, err = ClearActions(ActionClearQuery{UserID: 1, StartTime: 150, EndTime: 250}, 99, OperatorRoot)
	if err != nil {
		t.Fatalf("clear actions: %v", err)
	}
	if deleted != 1 {
		t.Fatalf("expected one action deleted, got %d", deleted)
	}
	actions, total, err = ListActions(ActionQuery{UserID: 1, Action: ActionAutoBan, Limit: 10})
	if err != nil {
		t.Fatalf("list remaining actions: %v", err)
	}
	if total != 1 || len(actions) != 1 || actions[0].CreatedAt != 100 {
		t.Fatalf("expected only old user action left, total=%d actions=%+v", total, actions)
	}
}

func TestRiskBanStoreClearsAllWithoutFilters(t *testing.T) {
	setupRiskBanTestDB(t)
	store := getStore()
	if store == nil {
		t.Fatalf("expected test store")
	}
	for _, event := range []Event{
		{UserID: 1, DedupeKey: "first", CreatedAt: 100},
		{UserID: 2, DedupeKey: "second", CreatedAt: 200},
	} {
		if _, _, err := store.InsertEvent(&event); err != nil {
			t.Fatalf("insert event: %v", err)
		}
	}
	for _, action := range []Action{
		{UserID: 1, Action: ActionAutoBan, WindowStart: 90, WindowEnd: 100, CreatedAt: 100},
		{UserID: 2, Action: ActionAutoBan, WindowStart: 190, WindowEnd: 200, CreatedAt: 200},
	} {
		if _, err := store.InsertActionIfMissing(&action); err != nil {
			t.Fatalf("insert action: %v", err)
		}
	}

	deletedEvents, err := ClearEvents(EventClearQuery{}, 99, OperatorRoot)
	if err != nil {
		t.Fatalf("clear all events: %v", err)
	}
	if deletedEvents != 2 {
		t.Fatalf("expected two events deleted, got %d", deletedEvents)
	}
	_, total, err := ListEvents(EventQuery{Limit: 10})
	if err != nil {
		t.Fatalf("list events: %v", err)
	}
	if total != 0 {
		t.Fatalf("expected no events left, got %d", total)
	}

	deletedActions, err := ClearActions(ActionClearQuery{}, 99, OperatorRoot)
	if err != nil {
		t.Fatalf("clear all actions: %v", err)
	}
	if deletedActions != 3 {
		t.Fatalf("expected three action rows deleted including event clear audit action, got %d", deletedActions)
	}
	actions, total, err := ListActions(ActionQuery{Limit: 10})
	if err != nil {
		t.Fatalf("list actions: %v", err)
	}
	if total != 1 || len(actions) != 1 || actions[0].Action != ActionClearBanRecords {
		t.Fatalf("expected only action clear audit record left, total=%d actions=%+v", total, actions)
	}
}
