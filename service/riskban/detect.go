package riskban

import (
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/types"
)

var riskHashSuffixRE = regexp.MustCompile(`\s*\(hash:\s*([^)]+?)\s*\)\s*$`)

func DetectRiskError(err *types.NewAPIError, settings Settings) Detection {
	settings = normalizeSettings(settings)
	if err == nil || !settings.Enabled || len(settings.BlockMessagePrefixes) == 0 {
		return Detection{}
	}
	if err.StatusCode != 403 {
		return Detection{}
	}
	message := strings.TrimSpace(err.Error())
	if message == "" {
		message = strings.TrimSpace(err.ToOpenAIError().Message)
	}
	if message == "" {
		return Detection{}
	}
	for _, prefix := range settings.BlockMessagePrefixes {
		if !strings.HasPrefix(message, prefix) {
			continue
		}
		return Detection{
			Matched:       true,
			Message:       message,
			MatchedPrefix: prefix,
			RiskHash:      parseRiskHash(message),
		}
	}
	return Detection{}
}

func parseRiskHash(message string) string {
	matches := riskHashSuffixRE.FindStringSubmatch(message)
	if len(matches) != 2 {
		return ""
	}
	return strings.TrimSpace(matches[1])
}
