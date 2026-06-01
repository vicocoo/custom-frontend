package router

import (
	"embed"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
)

func TestRiskBanWebRouterHidesUnauthenticatedRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-session-secret"))))
	riskBanWebHandler := newRiskBanWebHandler(embed.FS{}, []byte("<!doctype html><html><body>risk ban</body></html>"))
	router.NoRoute(func(c *gin.Context) {
		if riskBanWebHandler(c) {
			return
		}
		c.Status(http.StatusTeapot)
	})

	for _, path := range []string{"/risk-ban-admin", "/risk-ban-admin/", "/risk-ban-admin/settings", "/risk-ban-admin/assets/app.js"} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, path, nil)
			router.ServeHTTP(recorder, request)
			if recorder.Code != http.StatusNotFound {
				t.Fatalf("expected unauthenticated %s to return 404, got %d", path, recorder.Code)
			}
		})
	}
}
