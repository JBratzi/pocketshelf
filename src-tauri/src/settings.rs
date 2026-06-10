// PocketShelf settings persistence — docs/architecture.md §3.2 and §5.
// Stored as pretty JSON at <app_data_dir>/settings.json (atomic write via .tmp + rename).
// STUB: load() returns defaults; save() is a no-op. Backend implementer fills in.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// Absolute paths of folders to scan.
    pub rom_folders: Vec<String>,
    /// macOS app name passed to `open -a`, e.g. "OpenEmu".
    pub emulator_gba: String,
    /// macOS app name passed to `open -a`, e.g. "melonDS".
    pub emulator_nds: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            rom_folders: Vec::new(),
            emulator_gba: "OpenEmu".to_string(),
            emulator_nds: "OpenEmu".to_string(),
        }
    }
}

/// Reads <app_data_dir>/settings.json. Missing/corrupt file => defaults, no error.
/// Never creates the file on read.
/// STUB: always returns defaults.
pub fn load(_app: &tauri::AppHandle) -> Result<Settings, String> {
    Ok(Settings::default())
}

/// Writes pretty JSON atomically (settings.json.tmp then rename), creating
/// app_data_dir if missing.
/// STUB: no-op.
pub fn save(_app: &tauri::AppHandle, _settings: &Settings) -> Result<(), String> {
    Ok(())
}
