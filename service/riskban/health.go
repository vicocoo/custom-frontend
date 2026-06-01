package riskban

import (
	"fmt"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

func GetHealth() HealthStatus {
	store := getStore()
	status := HealthStatus{
		StoreAvailable: store != nil && store.Available() && store.Ping() == nil,
	}
	settings, ok := GetSettingsSnapshot()
	status.SnapshotLoaded = ok
	if !status.StoreAvailable {
		status.Warnings = append(status.Warnings, HealthWarning{
			Code:    "audit_store_unavailable",
			Message: "risk audit database is unavailable or not configured",
		})
	}
	if !ok {
		status.Warnings = append(status.Warnings, HealthWarning{
			Code:    "settings_snapshot_missing",
			Message: "risk-ban settings snapshot is not loaded",
		})
	} else if settings.BlockMessagePrefix == "" {
		status.Warnings = append(status.Warnings, HealthWarning{
			Code:    "empty_block_message_prefix",
			Message: "block_message_prefix is empty; risk-ban matching is disabled",
		})
	}
	if operation_setting.ShouldDisableByStatusCode(403) {
		status.Warnings = append(status.Warnings, HealthWarning{
			Code:    "channel_auto_disable_includes_403",
			Message: "automatic channel disable status codes include 403",
		})
	}
	status.Warnings = append(status.Warnings, collect403MappingWarnings()...)
	return status
}

func collect403MappingWarnings() []HealthWarning {
	if model.DB == nil {
		return nil
	}
	var channels []model.Channel
	if err := model.DB.Select("id", "name", "status", "status_code_mapping").
		Where("status = ?", common.ChannelStatusEnabled).
		Find(&channels).Error; err != nil {
		return []HealthWarning{{
			Code:    "channel_mapping_scan_failed",
			Message: fmt.Sprintf("failed to scan channel status-code mappings: %s", err.Error()),
		}}
	}
	warnings := make([]HealthWarning, 0)
	for _, channel := range channels {
		to, ok := mappedStatusCode(channel.GetStatusCodeMapping(), 403)
		if !ok || to == 403 {
			continue
		}
		warnings = append(warnings, HealthWarning{
			Code:        "channel_maps_403_away",
			Message:     "enabled channel maps upstream 403 to another status code",
			ChannelID:   channel.Id,
			ChannelName: channel.Name,
			FromStatus:  403,
			ToStatus:    to,
		})
	}
	return warnings
}

func mappedStatusCode(mapping string, from int) (int, bool) {
	if mapping == "" || mapping == "{}" {
		return 0, false
	}
	parsed := map[string]any{}
	if err := common.Unmarshal([]byte(mapping), &parsed); err != nil {
		return 0, false
	}
	raw, ok := parsed[strconv.Itoa(from)]
	if !ok {
		return 0, false
	}
	switch v := raw.(type) {
	case string:
		to, err := strconv.Atoi(v)
		return to, err == nil
	case float64:
		if v != float64(int(v)) {
			return 0, false
		}
		return int(v), true
	default:
		return 0, false
	}
}
