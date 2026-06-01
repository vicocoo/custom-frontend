package riskban

import (
	"fmt"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

func ObserveRelayError(c *gin.Context, info *relaycommon.RelayInfo, err *types.NewAPIError) ObserveResult {
	settings, ok := GetSettingsSnapshot()
	if !ok {
		common.SysLog("risk ban settings snapshot is unavailable")
		return ObserveResult{}
	}
	detection := DetectRiskError(err, settings)
	if !detection.Matched {
		return ObserveResult{}
	}
	result := ObserveResult{Matched: true}
	store := getStore()
	if store == nil || !store.Available() {
		result.Error = "risk audit store is unavailable"
		common.SysLog(result.Error)
		return result
	}

	input := ExtractedInput{}
	body, bodyErr := requestBodyBytes(c)
	if bodyErr != nil {
		logger.LogError(c, "risk ban input extraction body read failed: "+bodyErr.Error())
	} else {
		extracted, extractErr := ExtractInputFromJSON(body, info.RelayFormat, info.RelayMode, settings.InputMaxChars)
		if extractErr != nil {
			logger.LogError(c, "risk ban input extraction failed: "+extractErr.Error())
		} else {
			input = extracted
		}
	}

	event := buildEvent(c, info, err, settings, detection, input)
	created, stored, insertErr := store.InsertEvent(&event)
	if insertErr != nil {
		result.Error = insertErr.Error()
		common.SysLog("risk ban event insert failed: " + insertErr.Error())
		return result
	}
	if stored != nil {
		result.EventID = stored.ID
	}
	if !created {
		result.Duplicate = true
		return result
	}
	result.Recorded = true

	triggered, banErr := maybeDisableUser(store, stored, settings)
	if banErr != nil {
		result.Error = banErr.Error()
		common.SysLog("risk ban auto-disable failed: " + banErr.Error())
		return result
	}
	result.BanTriggered = triggered
	if triggered {
		_ = store.MarkEventBanTriggered(stored.ID)
	}
	return result
}

func requestBodyBytes(c *gin.Context) ([]byte, error) {
	if c == nil {
		return nil, fmt.Errorf("nil gin context")
	}
	storage, err := common.GetBodyStorage(c)
	if err != nil {
		return nil, err
	}
	return storage.Bytes()
}

func buildEvent(c *gin.Context, info *relaycommon.RelayInfo, err *types.NewAPIError, settings Settings, detection Detection, input ExtractedInput) Event {
	now := time.Now().Unix()
	requestID := ""
	if info != nil {
		requestID = info.RequestId
	}
	if requestID == "" && c != nil {
		requestID = c.GetString(common.RequestIdKey)
	}
	dedupeKey := requestID
	if dedupeKey == "" {
		dedupeKey = fmt.Sprintf("event-%d-%s", now, common.GetRandomString(12))
	}

	event := Event{
		RequestID:      limitString(requestID, 128),
		DedupeKey:      limitString(dedupeKey, 128),
		StatusCode:     err.StatusCode,
		MatchedPrefix:  settings.BlockMessagePrefix,
		ErrorMessage:   detection.Message,
		RiskHash:       limitString(detection.RiskHash, 191),
		InputText:      input.Text,
		InputCharCount: input.CharCount,
		InputTruncated: input.Truncated,
		CreatedAt:      now,
	}
	if info != nil {
		event.UserID = info.UserId
		event.TokenID = info.TokenId
		event.RelayFormat = limitString(string(info.RelayFormat), 64)
		event.RelayMode = limitString(strconv.Itoa(info.RelayMode), 64)
		event.Model = limitString(info.OriginModelName, 191)
		event.RequestPath = limitString(info.RequestURLPath, 512)
		if info.ChannelMeta != nil {
			event.ChannelID = info.ChannelMeta.ChannelId
			event.ChannelType = info.ChannelMeta.ChannelType
		}
	}
	if event.UserID == 0 && c != nil {
		event.UserID = common.GetContextKeyInt(c, constant.ContextKeyUserId)
	}
	if event.TokenID == 0 && c != nil {
		event.TokenID = common.GetContextKeyInt(c, constant.ContextKeyTokenId)
	}
	if event.ChannelID == 0 && c != nil {
		event.ChannelID = common.GetContextKeyInt(c, constant.ContextKeyChannelId)
	}
	if event.ChannelType == 0 && c != nil {
		event.ChannelType = common.GetContextKeyInt(c, constant.ContextKeyChannelType)
	}
	return event
}

func maybeDisableUser(store *Store, event *Event, settings Settings) (bool, error) {
	if event == nil || event.UserID <= 0 {
		return false, nil
	}
	now := time.Now().Unix()
	windowStart := now - settings.WindowSeconds
	count, err := store.CountUserEventsSince(event.UserID, windowStart)
	if err != nil {
		return false, err
	}
	if count < int64(settings.Threshold) {
		return false, nil
	}
	user, err := model.GetUserById(event.UserID, true)
	if err != nil {
		return false, err
	}
	if user.Role == common.RoleRootUser {
		_, actionErr := store.InsertActionIfMissing(&Action{
			UserID:       event.UserID,
			Action:       ActionAutoBanSkipped,
			Reason:       "root user is excluded from risk auto-ban",
			OperatorType: OperatorSystem,
			WindowStart:  windowStart,
			WindowEnd:    now,
			EventCount:   int(count),
		})
		return false, actionErr
	}
	disabled, err := model.DisableUserById(event.UserID, "risk auto-ban threshold reached")
	if err != nil {
		return false, err
	}
	inserted, err := store.InsertActionIfMissing(&Action{
		UserID:       event.UserID,
		Action:       ActionAutoBan,
		Reason:       "risk auto-ban threshold reached",
		OperatorType: OperatorSystem,
		WindowStart:  windowStart,
		WindowEnd:    now,
		EventCount:   int(count),
	})
	if err != nil {
		return false, err
	}
	return disabled || inserted, nil
}

func limitString(value string, maxLen int) string {
	if maxLen <= 0 {
		return value
	}
	runes := []rune(value)
	if len(runes) <= maxLen {
		return value
	}
	return string(runes[:maxLen])
}
