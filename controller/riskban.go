package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service/riskban"
	"github.com/gin-gonic/gin"
)

func RiskBanCanRead(c *gin.Context) bool {
	role := c.GetInt("role")
	return role >= common.RoleRootUser || (role >= common.RoleAdminUser && riskban.AdminAPIEnabledForNonRoot())
}

func RiskBanOperatorType(c *gin.Context) string {
	if c.GetInt("role") >= common.RoleRootUser {
		return riskban.OperatorRoot
	}
	return riskban.OperatorAdmin
}

func GetRiskBanSettings(c *gin.Context) {
	if !RiskBanCanRead(c) {
		common.ApiError(c, errRiskBanForbidden)
		return
	}
	settings, snapshotLoaded, err := riskban.CurrentSettingsForRead()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"settings":        settings,
		"snapshot_loaded": snapshotLoaded,
	})
}

func UpdateRiskBanSettings(c *gin.Context) {
	var settings riskban.Settings
	if err := common.DecodeJson(c.Request.Body, &settings); err != nil {
		common.ApiError(c, err)
		return
	}
	updated, err := riskban.UpdateSettings(settings)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, updated)
}

func GetRiskBanEvents(c *gin.Context) {
	if !RiskBanCanRead(c) {
		common.ApiError(c, errRiskBanForbidden)
		return
	}
	pageInfo := common.GetPageQuery(c)
	events, total, err := riskban.ListEvents(riskban.EventQuery{
		UserID:    riskBanQueryInt(c, "user_id"),
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
		Offset:    pageInfo.GetStartIdx(),
		Limit:     pageInfo.GetPageSize(),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(events)
	common.ApiSuccess(c, pageInfo)
}

func GetRiskBanUserEvents(c *gin.Context) {
	if !RiskBanCanRead(c) {
		common.ApiError(c, errRiskBanForbidden)
		return
	}
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo := common.GetPageQuery(c)
	events, total, err := riskban.ListEvents(riskban.EventQuery{
		UserID:    userID,
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
		Offset:    pageInfo.GetStartIdx(),
		Limit:     pageInfo.GetPageSize(),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(events)
	common.ApiSuccess(c, pageInfo)
}

func GetRiskBanBannedUsers(c *gin.Context) {
	if !RiskBanCanRead(c) {
		common.ApiError(c, errRiskBanForbidden)
		return
	}
	pageInfo := common.GetPageQuery(c)
	users, total, err := riskban.ListBannedUsers(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)
	common.ApiSuccess(c, pageInfo)
}

func GetRiskBanActions(c *gin.Context) {
	if !RiskBanCanRead(c) {
		common.ApiError(c, errRiskBanForbidden)
		return
	}
	pageInfo := common.GetPageQuery(c)
	actions, total, err := riskban.ListActions(riskban.ActionQuery{
		UserID:    riskBanQueryInt(c, "user_id"),
		Action:    c.Query("action"),
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
		Offset:    pageInfo.GetStartIdx(),
		Limit:     pageInfo.GetPageSize(),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(actions)
	common.ApiSuccess(c, pageInfo)
}

func GetRiskBanHealth(c *gin.Context) {
	if !RiskBanCanRead(c) {
		common.ApiError(c, errRiskBanForbidden)
		return
	}
	common.ApiSuccess(c, riskban.GetHealth())
}

func DeleteRiskBanEvents(c *gin.Context) {
	count, err := riskban.ClearEvents(riskban.EventClearQuery{
		UserID:    riskBanQueryInt(c, "user_id"),
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
	}, c.GetInt("id"), RiskBanOperatorType(c))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"deleted": count})
}

func DeleteRiskBanUserEvents(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	count, err := riskban.ClearEvents(riskban.EventClearQuery{
		UserID:    userID,
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
	}, c.GetInt("id"), RiskBanOperatorType(c))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"deleted": count})
}

func DeleteRiskBanActions(c *gin.Context) {
	count, err := riskban.ClearActions(riskban.ActionClearQuery{
		UserID:    riskBanQueryInt(c, "user_id"),
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
	}, c.GetInt("id"), RiskBanOperatorType(c))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"deleted": count})
}

func DeleteRiskBanUserActions(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	count, err := riskban.ClearActions(riskban.ActionClearQuery{
		UserID:    userID,
		StartTime: riskBanQueryInt64(c, "start_time"),
		EndTime:   riskBanQueryInt64(c, "end_time"),
	}, c.GetInt("id"), RiskBanOperatorType(c))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"deleted": count})
}

var errRiskBanForbidden = &riskBanForbiddenError{}

type riskBanForbiddenError struct{}

func (e *riskBanForbiddenError) Error() string {
	return "risk-ban admin API is disabled for non-root admins"
}

func riskBanQueryInt(c *gin.Context, key string) int {
	value, err := strconv.Atoi(c.Query(key))
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func riskBanQueryInt64(c *gin.Context, key string) int64 {
	value, err := strconv.ParseInt(c.Query(key), 10, 64)
	if err != nil || value < 0 {
		return 0
	}
	return value
}
