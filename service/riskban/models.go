package riskban

const (
	ActionAutoBan         = "auto_ban"
	ActionAutoBanSkipped  = "auto_ban_skipped"
	ActionClearUserEvents = "clear_user_events"
	ActionClearAllEvents  = "clear_all_events"
	ActionClearBanRecords = "clear_ban_records"

	OperatorSystem = "system"
	OperatorAdmin  = "admin"
	OperatorRoot   = "root"
)

type Settings struct {
	ID                 uint   `json:"id" gorm:"primaryKey"`
	Enabled            bool   `json:"enabled" gorm:"default:false"`
	WindowSeconds      int64  `json:"window_seconds" gorm:"default:86400"`
	Threshold          int    `json:"threshold" gorm:"default:3"`
	BlockMessagePrefix string `json:"block_message_prefix" gorm:"type:text"`
	InputMaxChars      int    `json:"input_max_chars" gorm:"default:12000"`
	AdminAPIEnabled    bool   `json:"admin_api_enabled" gorm:"default:true"`
	CreatedAt          int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt          int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Settings) TableName() string {
	return "risk_ban_settings"
}

type Event struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	UserID         int    `json:"user_id" gorm:"uniqueIndex:idx_risk_ban_user_dedupe;index:idx_risk_ban_user_created,priority:1"`
	TokenID        int    `json:"token_id"`
	ChannelID      int    `json:"channel_id"`
	ChannelType    int    `json:"channel_type"`
	RequestID      string `json:"request_id" gorm:"size:128"`
	DedupeKey      string `json:"dedupe_key" gorm:"size:128;uniqueIndex:idx_risk_ban_user_dedupe"`
	RelayFormat    string `json:"relay_format" gorm:"size:64"`
	RelayMode      string `json:"relay_mode" gorm:"size:64"`
	Model          string `json:"model" gorm:"size:191"`
	RequestPath    string `json:"request_path" gorm:"size:512"`
	InputText      string `json:"input_text" gorm:"type:text"`
	InputCharCount int    `json:"input_char_count"`
	InputTruncated bool   `json:"input_truncated"`
	StatusCode     int    `json:"status_code"`
	MatchedPrefix  string `json:"matched_prefix" gorm:"type:text"`
	ErrorMessage   string `json:"error_message" gorm:"type:text"`
	RiskHash       string `json:"risk_hash" gorm:"size:191;index"`
	CreatedAt      int64  `json:"created_at" gorm:"index;index:idx_risk_ban_user_created,priority:2;index:idx_risk_ban_trigger_created,priority:2"`
	BanTriggered   bool   `json:"ban_triggered" gorm:"index:idx_risk_ban_trigger_created,priority:1"`
}

func (Event) TableName() string {
	return "risk_ban_events"
}

type Action struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	UserID         int    `json:"user_id" gorm:"index:idx_risk_ban_user_action_window,priority:1"`
	Action         string `json:"action" gorm:"size:64;index:idx_risk_ban_user_action_window,priority:2"`
	Reason         string `json:"reason" gorm:"type:text"`
	OperatorUserID int    `json:"operator_user_id"`
	OperatorType   string `json:"operator_type" gorm:"size:64"`
	WindowStart    int64  `json:"window_start" gorm:"index:idx_risk_ban_user_action_window,priority:3"`
	WindowEnd      int64  `json:"window_end" gorm:"index:idx_risk_ban_user_action_window,priority:4"`
	EventCount     int    `json:"event_count"`
	CreatedAt      int64  `json:"created_at" gorm:"index"`
}

func (Action) TableName() string {
	return "risk_ban_actions"
}

type Detection struct {
	Matched  bool
	Message  string
	RiskHash string
}

type ExtractedInput struct {
	Text      string `json:"text"`
	CharCount int    `json:"char_count"`
	Truncated bool   `json:"truncated"`
}

type ObserveResult struct {
	Matched      bool   `json:"matched"`
	Recorded     bool   `json:"recorded"`
	Duplicate    bool   `json:"duplicate"`
	BanTriggered bool   `json:"ban_triggered"`
	EventID      uint   `json:"event_id,omitempty"`
	Error        string `json:"error,omitempty"`
}

type EventQuery struct {
	UserID int
	Offset int
	Limit  int
}

type ActionQuery struct {
	UserID int
	Action string
	Offset int
	Limit  int
}

type BannedUser struct {
	UserID      int    `json:"user_id"`
	Username    string `json:"username,omitempty"`
	DisplayName string `json:"display_name,omitempty"`
	Status      int    `json:"status"`
	BannedAt    int64  `json:"banned_at"`
	EventCount  int    `json:"event_count"`
	ActionID    uint   `json:"action_id"`
}

type HealthWarning struct {
	Code        string `json:"code"`
	Message     string `json:"message"`
	ChannelID   int    `json:"channel_id,omitempty"`
	ChannelName string `json:"channel_name,omitempty"`
	FromStatus  int    `json:"from_status,omitempty"`
	ToStatus    int    `json:"to_status,omitempty"`
}

type HealthStatus struct {
	StoreAvailable bool            `json:"store_available"`
	SnapshotLoaded bool            `json:"snapshot_loaded"`
	Warnings       []HealthWarning `json:"warnings"`
}
