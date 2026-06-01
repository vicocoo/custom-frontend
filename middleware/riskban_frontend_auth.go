package middleware

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/riskban"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func RiskBanFrontendAuth404() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !RiskBanFrontendAuthorized(c) {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		c.Next()
	}
}

func RiskBanFrontendAuthorized(c *gin.Context) bool {
	session := sessions.Default(c)
	id, ok := session.Get("id").(int)
	if !ok || id <= 0 {
		return false
	}
	user, err := model.GetUserById(id, false)
	if err != nil || user == nil || user.Status != common.UserStatusEnabled {
		return false
	}
	if user.Role >= common.RoleRootUser {
		return true
	}
	return user.Role >= common.RoleAdminUser && riskban.AdminAPIEnabledForNonRoot()
}
