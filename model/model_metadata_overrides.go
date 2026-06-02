package model

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

var defaultModelMetadataOverridesPaths = []string{
	"model-metadata-overrides.json",
	"data/model-metadata-overrides.json",
}

type ModelMetadataOverride struct {
	ContextLength    *int64   `json:"context_length,omitempty"`
	MaxOutputTokens  *int64   `json:"max_output_tokens,omitempty"`
	KnowledgeCutoff  string   `json:"knowledge_cutoff,omitempty"`
	ReleaseDate      string   `json:"release_date,omitempty"`
	ParameterCount   string   `json:"parameter_count,omitempty"`
	InputModalities  []string `json:"input_modalities,omitempty"`
	OutputModalities []string `json:"output_modalities,omitempty"`
	Capabilities     []string `json:"capabilities,omitempty"`
}

func loadModelMetadataOverrides() map[string]ModelMetadataOverride {
	overrides, err := loadModelMetadataOverridesFromPaths(defaultModelMetadataOverridesPaths)
	if err != nil {
		common.SysError("failed to load model metadata overrides: " + err.Error())
		return map[string]ModelMetadataOverride{}
	}
	return overrides
}

func loadModelMetadataOverridesFromPaths(paths []string) (map[string]ModelMetadataOverride, error) {
	for _, path := range paths {
		if strings.TrimSpace(path) == "" {
			continue
		}
		overrides, found, err := loadModelMetadataOverridesFromFile(path)
		if err != nil {
			return nil, err
		}
		if found {
			return overrides, nil
		}
	}
	return map[string]ModelMetadataOverride{}, nil
}

func loadModelMetadataOverridesFromFile(path string) (map[string]ModelMetadataOverride, bool, error) {
	data, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return map[string]ModelMetadataOverride{}, false, nil
		}
		return nil, false, err
	}

	var raw map[string]ModelMetadataOverride
	if err := common.Unmarshal(data, &raw); err != nil {
		return nil, false, err
	}

	overrides := make(map[string]ModelMetadataOverride, len(raw))
	for modelName, override := range raw {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			continue
		}
		overrides[modelName] = override
	}
	return overrides, true, nil
}

func applyModelMetadataOverride(pricing *Pricing, overrides map[string]ModelMetadataOverride) {
	if pricing == nil || len(overrides) == 0 {
		return
	}
	override, ok := overrides[pricing.ModelName]
	if !ok {
		return
	}

	if override.ContextLength != nil {
		pricing.ContextLength = override.ContextLength
	}
	if override.MaxOutputTokens != nil {
		pricing.MaxOutputTokens = override.MaxOutputTokens
	}
	if override.KnowledgeCutoff != "" {
		pricing.KnowledgeCutoff = override.KnowledgeCutoff
	}
	if override.ReleaseDate != "" {
		pricing.ReleaseDate = override.ReleaseDate
	}
	if override.ParameterCount != "" {
		pricing.ParameterCount = override.ParameterCount
	}
	if override.InputModalities != nil {
		pricing.InputModalities = override.InputModalities
	}
	if override.OutputModalities != nil {
		pricing.OutputModalities = override.OutputModalities
	}
	if override.Capabilities != nil {
		pricing.Capabilities = override.Capabilities
	}
}
