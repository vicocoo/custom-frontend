package riskban

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/types"
)

func ExtractInputFromJSON(body []byte, relayFormat types.RelayFormat, relayMode int, maxChars int) (ExtractedInput, error) {
	if maxChars <= 0 {
		maxChars = DefaultSettings().InputMaxChars
	}
	var root map[string]json.RawMessage
	if err := common.Unmarshal(body, &root); err != nil {
		return ExtractedInput{}, err
	}

	var text string
	switch relayFormat {
	case types.RelayFormatClaude:
		text = extractLastMessageContent(root["messages"])
	case types.RelayFormatGemini:
		text = extractGeminiContent(root["contents"])
	case types.RelayFormatOpenAIResponses, types.RelayFormatOpenAIResponsesCompaction:
		text = extractResponsesInput(root["input"])
	case types.RelayFormatOpenAIImage:
		text = extractImageInput(root)
	default:
		text = extractLastMessageContent(root["messages"])
	}
	return truncateInput(text, maxChars), nil
}

func extractLastMessageContent(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var messages []map[string]json.RawMessage
	if err := common.Unmarshal(raw, &messages); err != nil {
		return ""
	}
	for i := len(messages) - 1; i >= 0; i-- {
		if getString(messages[i]["role"]) != "user" {
			continue
		}
		return extractContent(messages[i]["content"])
	}
	return ""
}

func extractGeminiContent(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var contents []map[string]json.RawMessage
	if err := common.Unmarshal(raw, &contents); err != nil {
		return ""
	}
	selected := -1
	for i := len(contents) - 1; i >= 0; i-- {
		role := getString(contents[i]["role"])
		if role == "user" || role == "" {
			selected = i
			break
		}
	}
	if selected < 0 {
		return ""
	}
	return extractParts(contents[selected]["parts"])
}

func extractResponsesInput(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	if common.GetJsonType(raw) == "string" {
		return getString(raw)
	}
	var items []map[string]json.RawMessage
	if err := common.Unmarshal(raw, &items); err != nil {
		return ""
	}
	for i := len(items) - 1; i >= 0; i-- {
		role := getString(items[i]["role"])
		itemType := getString(items[i]["type"])
		if role == "user" || (itemType == "message" && role == "user") {
			if content := extractContent(items[i]["content"]); content != "" {
				return content
			}
			return extractContent(items[i]["input"])
		}
	}
	return ""
}

func extractImageInput(root map[string]json.RawMessage) string {
	parts := make([]string, 0, 4)
	if prompt := getString(root["prompt"]); prompt != "" {
		parts = append(parts, prompt)
	}
	for _, key := range []string{"image", "images", "mask"} {
		if len(root[key]) > 0 && string(root[key]) != "null" {
			parts = append(parts, fmt.Sprintf("[media: %s]", key))
		}
	}
	return strings.Join(parts, "\n")
}

func extractContent(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	if common.GetJsonType(raw) == "string" {
		return getString(raw)
	}
	return extractParts(raw)
}

func extractParts(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var parts []map[string]json.RawMessage
	if err := common.Unmarshal(raw, &parts); err != nil {
		return ""
	}
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if text := getString(part["text"]); text != "" {
			out = append(out, text)
			continue
		}
		partType := getString(part["type"])
		if partType == "text" || partType == "input_text" {
			if text := getString(part["text"]); text != "" {
				out = append(out, text)
			}
			continue
		}
		if marker := mediaMarker(part, partType); marker != "" {
			out = append(out, marker)
		}
	}
	return strings.Join(out, "\n")
}

func mediaMarker(part map[string]json.RawMessage, partType string) string {
	if partType != "" {
		switch partType {
		case "image_url", "input_image", "image", "input_file", "file", "audio", "input_audio":
			return fmt.Sprintf("[media: %s]", partType)
		}
	}
	for _, key := range []string{"image_url", "inline_data", "inlineData", "file_data", "source", "audio", "image", "file"} {
		if len(part[key]) > 0 && string(part[key]) != "null" {
			return fmt.Sprintf("[media: %s]", key)
		}
	}
	return ""
}

func getString(raw json.RawMessage) string {
	if len(raw) == 0 || common.GetJsonType(raw) != "string" {
		return ""
	}
	var value string
	if err := common.Unmarshal(raw, &value); err != nil {
		return ""
	}
	return value
}

func truncateInput(text string, maxChars int) ExtractedInput {
	runes := []rune(text)
	result := ExtractedInput{
		Text:      text,
		CharCount: len(runes),
	}
	if maxChars > 0 && len(runes) > maxChars {
		result.Text = string(runes[:maxChars])
		result.Truncated = true
	}
	return result
}
