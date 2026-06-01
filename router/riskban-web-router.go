package router

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

type optionalWebHandler func(*gin.Context) bool

func newRiskBanWebHandler(buildFS embed.FS, indexPage []byte) optionalWebHandler {
	if len(indexPage) == 0 {
		indexPage = []byte("<!doctype html><html><head><title>Risk Ban Admin</title></head><body>Risk Ban Admin</body></html>")
	}
	staticFS, err := fs.Sub(buildFS, "web/risk-ban/dist")
	if err != nil {
		staticFS = nil
	}
	return func(c *gin.Context) bool {
		path := c.Request.URL.Path
		if path != "/risk-ban-admin" && !strings.HasPrefix(path, "/risk-ban-admin/") {
			return false
		}
		c.Set(middleware.RouteTagKey, "web")
		if !middleware.RiskBanFrontendAuthorized(c) {
			c.AbortWithStatus(http.StatusNotFound)
			return true
		}
		if path == "/risk-ban-admin" || path == "/risk-ban-admin/" {
			serveRiskBanIndex(c, indexPage)
			return true
		}
		if strings.HasPrefix(path, "/risk-ban-admin/assets/") {
			assetPath := strings.TrimPrefix(path, "/risk-ban-admin/")
			if assetPath == "assets/" || staticFS == nil {
				c.Status(http.StatusNotFound)
				return true
			}
			c.FileFromFS(assetPath, http.FS(staticFS))
			return true
		}
		serveRiskBanIndex(c, indexPage)
		return true
	}
}

func serveRiskBanIndex(c *gin.Context, indexPage []byte) {
	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
}
