package riskban

import (
	"errors"
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/types"
)

func TestDetectRiskErrorMatchesConfigured403PrefixAndHash(t *testing.T) {
	settings := Settings{
		Enabled:            true,
		BlockMessagePrefix: "risk audit blocked",
		InputMaxChars:      12000,
	}
	err := types.NewOpenAIError(
		errors.New("risk audit blocked: unsafe prompt (hash: abc123)"),
		types.ErrorCodeBadResponseStatusCode,
		http.StatusForbidden,
	)

	result := DetectRiskError(err, settings)

	if !result.Matched {
		t.Fatalf("expected risk error to match")
	}
	if result.Message != "risk audit blocked: unsafe prompt (hash: abc123)" {
		t.Fatalf("unexpected message: %q", result.Message)
	}
	if result.RiskHash != "abc123" {
		t.Fatalf("expected hash abc123, got %q", result.RiskHash)
	}
}

func TestDetectRiskErrorRejectsDisabledEmptyPrefixAndNon403(t *testing.T) {
	err := types.NewOpenAIError(
		errors.New("risk audit blocked: unsafe prompt"),
		types.ErrorCodeBadResponseStatusCode,
		http.StatusForbidden,
	)

	if DetectRiskError(err, Settings{Enabled: false, BlockMessagePrefix: "risk audit blocked"}).Matched {
		t.Fatalf("disabled settings must not match")
	}
	if DetectRiskError(err, Settings{Enabled: true}).Matched {
		t.Fatalf("empty prefix must not match")
	}
	non403 := types.NewOpenAIError(
		errors.New("risk audit blocked: unsafe prompt"),
		types.ErrorCodeBadResponseStatusCode,
		http.StatusBadRequest,
	)
	if DetectRiskError(non403, Settings{Enabled: true, BlockMessagePrefix: "risk audit blocked"}).Matched {
		t.Fatalf("non-403 status must not match")
	}
}

func TestExtractInputUsesLastUserMessageAndTruncatesByRunes(t *testing.T) {
	body := []byte(`{
		"messages": [
			{"role": "system", "content": "ignore"},
			{"role": "user", "content": "first"},
			{"role": "assistant", "content": "reply"},
			{"role": "user", "content": [
				{"type": "text", "text": "你好世界"},
				{"type": "image_url", "image_url": {"url": "data:image/png;base64,xxx"}}
			]}
		]
	}`)

	extracted, err := ExtractInputFromJSON(body, types.RelayFormatOpenAI, 0, 3)
	if err != nil {
		t.Fatalf("extract input failed: %v", err)
	}
	if extracted.Text != "你好世" {
		t.Fatalf("expected rune-truncated text, got %q", extracted.Text)
	}
	if extracted.CharCount <= 3 {
		t.Fatalf("expected original char count to be preserved, got %d", extracted.CharCount)
	}
	if !extracted.Truncated {
		t.Fatalf("expected input to be marked truncated")
	}
}

func TestExtractInputSupportsGeminiResponsesAndImages(t *testing.T) {
	geminiBody := []byte(`{"contents":[{"role":"user","parts":[{"text":"old"}]},{"role":"model","parts":[{"text":"ok"}]},{"role":"user","parts":[{"text":"gemini prompt"},{"inline_data":{"mime_type":"image/png"}}]}]}`)
	gemini, err := ExtractInputFromJSON(geminiBody, types.RelayFormatGemini, 0, 12000)
	if err != nil {
		t.Fatalf("extract gemini input failed: %v", err)
	}
	if gemini.Text != "gemini prompt\n[media: inline_data]" {
		t.Fatalf("unexpected gemini input: %q", gemini.Text)
	}

	responsesBody := []byte(`{"input":[{"role":"user","content":[{"type":"input_text","text":"first"}]},{"type":"message","role":"user","content":[{"type":"input_text","text":"responses prompt"},{"type":"input_image","image_url":"data:image/png;base64,xxx"}]}]}`)
	responses, err := ExtractInputFromJSON(responsesBody, types.RelayFormatOpenAIResponses, 0, 12000)
	if err != nil {
		t.Fatalf("extract responses input failed: %v", err)
	}
	if responses.Text != "responses prompt\n[media: input_image]" {
		t.Fatalf("unexpected responses input: %q", responses.Text)
	}

	imageBody := []byte(`{"prompt":"draw this","image":"data:image/png;base64,xxx","mask":"data:image/png;base64,yyy"}`)
	image, err := ExtractInputFromJSON(imageBody, types.RelayFormatOpenAIImage, 0, 12000)
	if err != nil {
		t.Fatalf("extract image input failed: %v", err)
	}
	if image.Text != "draw this\n[media: image]\n[media: mask]" {
		t.Fatalf("unexpected image input: %q", image.Text)
	}
}
