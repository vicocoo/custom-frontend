package model

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func testPtrInt64(value int64) *int64 {
	return &value
}

func TestLoadModelMetadataOverridesMissingFile(t *testing.T) {
	overrides, found, err := loadModelMetadataOverridesFromFile(filepath.Join(t.TempDir(), "missing.json"))

	require.NoError(t, err)
	require.False(t, found)
	require.Empty(t, overrides)
}

func TestLoadModelMetadataOverridesFromPathsUsesFirstExistingFile(t *testing.T) {
	dir := t.TempDir()
	first := filepath.Join(dir, "missing.json")
	second := filepath.Join(dir, "model-metadata-overrides.json")
	err := os.WriteFile(second, []byte(`{"gpt-4o":{"context_length":128000}}`), 0644)
	require.NoError(t, err)

	overrides, err := loadModelMetadataOverridesFromPaths([]string{first, second})

	require.NoError(t, err)
	require.Len(t, overrides, 1)
	require.Equal(t, int64(128000), *overrides["gpt-4o"].ContextLength)
}

func TestLoadModelMetadataOverridesAndApplyToPricing(t *testing.T) {
	path := filepath.Join(t.TempDir(), "model-metadata-overrides.json")
	err := os.WriteFile(path, []byte(`{
  "gpt-4o": {
    "context_length": 128000,
    "max_output_tokens": 16384,
    "knowledge_cutoff": "2023-10",
    "release_date": "2024-05-13",
    "parameter_count": "unknown",
    "input_modalities": ["text", "image"],
    "output_modalities": ["text"],
    "capabilities": ["streaming", "vision"]
  },
  "": {
    "context_length": 1
  }
}`), 0644)
	require.NoError(t, err)

	overrides, found, err := loadModelMetadataOverridesFromFile(path)
	require.NoError(t, err)
	require.True(t, found)
	require.Len(t, overrides, 1)

	pricing := Pricing{ModelName: "gpt-4o"}
	applyModelMetadataOverride(&pricing, overrides)

	require.Equal(t, int64(128000), *pricing.ContextLength)
	require.Equal(t, int64(16384), *pricing.MaxOutputTokens)
	require.Equal(t, "2023-10", pricing.KnowledgeCutoff)
	require.Equal(t, "2024-05-13", pricing.ReleaseDate)
	require.Equal(t, "unknown", pricing.ParameterCount)
	require.Equal(t, []string{"text", "image"}, pricing.InputModalities)
	require.Equal(t, []string{"text"}, pricing.OutputModalities)
	require.Equal(t, []string{"streaming", "vision"}, pricing.Capabilities)
}

func TestApplyModelMetadataOverrideSkipsMissingModel(t *testing.T) {
	contextLength := int64(4096)
	pricing := Pricing{
		ModelName:       "missing-model",
		ContextLength:   &contextLength,
		KnowledgeCutoff: "2024-01",
	}

	applyModelMetadataOverride(&pricing, map[string]ModelMetadataOverride{
		"other-model": {
			ContextLength:   testPtrInt64(128000),
			KnowledgeCutoff: "2023-10",
		},
	})

	require.Equal(t, int64(4096), *pricing.ContextLength)
	require.Equal(t, "2024-01", pricing.KnowledgeCutoff)
}
