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
	userID, _ := strconv.Atoi(c.Query("user_id"))
	events, total, err := riskban.ListEvents(riskban.EventQuery{
		UserID: userID,
		Offset: pageInfo.GetStartIdx(),
		Limit:  pageInfo.GetPageSize(),
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
		UserID: userID,
		Offset: pageInfo.GetStartIdx(),
		Limit:  pageInfo.GetPageSize(),
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
	userID, _ := strconv.Atoi(c.Query("user_id"))
	actions, total, err := riskban.ListActions(riskban.ActionQuery{
		UserID: userID,
		Action: c.Query("action"),
		Offset: pageInfo.GetStartIdx(),
		Limit:  pageInfo.GetPageSize(),
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
	count, err := riskban.ClearEvents(0, c.GetInt("id"), RiskBanOperatorType(c))
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
	count, err := riskban.ClearEvents(userID, c.GetInt("id"), RiskBanOperatorType(c))
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
	count, err := riskban.ClearUserActions(userID, c.GetInt("id"), RiskBanOperatorType(c))
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
