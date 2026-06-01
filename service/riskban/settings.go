package riskban

import (
	"fmt"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/QuantumNous/new-api/common"
)

var settingsSnapshot atomic.Pointer[Settings]

var (
	storeMu      sync.RWMutex
	currentStore *Store
)

func DefaultSettings() Settings {
	return Settings{
		Enabled:            false,
		WindowSeconds:      86400,
		Threshold:          3,
		BlockMessagePrefix: "",
		InputMaxChars:      12000,
		AdminAPIEnabled:    true,
	}
}

func normalizeSettings(settings Settings) Settings {
	defaults := DefaultSettings()
	if settings.WindowSeconds <= 0 {
		settings.WindowSeconds = defaults.WindowSeconds
	}
	if settings.Threshold <= 0 {
		settings.Threshold = defaults.Threshold
	}
	if settings.InputMaxChars <= 0 {
		settings.InputMaxChars = defaults.InputMaxChars
	}
	settings.BlockMessagePrefix = strings.TrimSpace(settings.BlockMessagePrefix)
	return settings
}

func ValidateSettings(settings Settings) error {
	if settings.Threshold < 1 {
		return fmt.Errorf("threshold must be >= 1")
	}
	if settings.WindowSeconds <= 0 {
		return fmt.Errorf("window_seconds must be > 0")
	}
	if settings.InputMaxChars <= 0 {
		return fmt.Errorf("input_max_chars must be > 0")
	}
	if settings.Enabled && strings.TrimSpace(settings.BlockMessagePrefix) == "" {
		return fmt.Errorf("block_message_prefix is required when enabled")
	}
	return nil
}

func setSettingsSnapshot(settings *Settings) {
	if settings == nil {
		settingsSnapshot.Store(nil)
		return
	}
	normalized := normalizeSettings(*settings)
	settingsSnapshot.Store(&normalized)
}

func GetSettingsSnapshot() (Settings, bool) {
	settings := settingsSnapshot.Load()
	if settings == nil {
		return Settings{}, false
	}
	return *settings, true
}

func SetSettingsSnapshotForTest(settings *Settings) {
	setSettingsSnapshot(settings)
}

func SetStore(store *Store) {
	storeMu.Lock()
	defer storeMu.Unlock()
	currentStore = store
}

func getStore() *Store {
	storeMu.RLock()
	defer storeMu.RUnlock()
	return currentStore
}

func SetStoreForTest(store *Store) {
	SetStore(store)
}

func RefreshSettingsSnapshot() error {
	store := getStore()
	if store == nil {
		return fmt.Errorf("risk audit store is unavailable")
	}
	settings, err := store.LoadSettings()
	if err != nil {
		return err
	}
	setSettingsSnapshot(&settings)
	return nil
}

func UpdateSettings(settings Settings) (Settings, error) {
	settings = normalizeSettings(settings)
	if err := ValidateSettings(settings); err != nil {
		return Settings{}, err
	}
	store := getStore()
	if store == nil {
		return Settings{}, fmt.Errorf("risk audit store is unavailable")
	}
	updated, err := store.SaveSettings(settings)
	if err != nil {
		return Settings{}, err
	}
	setSettingsSnapshot(&updated)
	return updated, nil
}

func CurrentSettingsForRead() (Settings, bool, error) {
	if settings, ok := GetSettingsSnapshot(); ok {
		return settings, true, nil
	}
	store := getStore()
	if store == nil {
		return DefaultSettings(), false, nil
	}
	settings, err := store.LoadSettings()
	if err != nil {
		return DefaultSettings(), false, err
	}
	setSettingsSnapshot(&settings)
	return settings, true, nil
}

func AdminAPIEnabledForNonRoot() bool {
	settings, ok, err := CurrentSettingsForRead()
	if err != nil {
		common.SysLog("risk ban settings read failed: " + err.Error())
		return false
	}
	return ok && settings.AdminAPIEnabled
}
