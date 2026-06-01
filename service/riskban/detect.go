package riskban

import (
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/types"
)

var riskHashSuffixRE = regexp.MustCompile(`\s*\(hash:\s*([^)]+?)\s*\)\s*$`)

func DetectRiskError(err *types.NewAPIError, settings Settings) Detection {
	settings = normalizeSettings(settings)
	if err == nil || !settings.Enabled || settings.BlockMessagePrefix == "" {
		return Detection{}
	}
	if err.StatusCode != 403 {
		return Detection{}
	}
	message := strings.TrimSpace(err.Error())
	if message == "" {
		message = strings.TrimSpace(err.ToOpenAIError().Message)
	}
	if message == "" || !strings.HasPrefix(message, settings.BlockMessagePrefix) {
		return Detection{}
	}
	return Detection{
		Matched:  true,
		Message:  message,
		RiskHash: parseRiskHash(message),
	}
}

func parseRiskHash(message string) string {
	matches := riskHashSuffixRE.FindStringSubmatch(message)
	if len(matches) != 2 {
		return ""
	}
	return strings.TrimSpace(matches[1])
}
