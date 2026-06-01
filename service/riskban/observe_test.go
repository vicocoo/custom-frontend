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
