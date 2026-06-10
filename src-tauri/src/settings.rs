// PocketShelf settings persistence — docs/architecture.md §3.2 and §5.
// Stored as pretty JSON at <app_data_dir>/settings.json (atomic write via .tmp + rename).

use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// Absolute paths of folders to scan.
    pub rom_folders: Vec<String>,
    /// Absolute paths of individual ROM files added outside any scanned
    /// folder (e.g. via drag & drop onto the window).
    pub rom_files: Vec<String>,
    /// macOS app name passed to `open -a`, e.g. "OpenEmu".
    pub emulator_gba: String,
    /// macOS app name passed to `open -a`, e.g. "melonDS".
    pub emulator_nds: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            rom_folders: Vec::new(),
            rom_files: Vec::new(),
            emulator_gba: "OpenEmu".to_string(),
            emulator_nds: "melonDS".to_string(),
        }
    }
}

fn settings_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("settings: cannot resolve app data dir: {e}"))?;
    Ok(dir.join("settings.json"))
}

/// Reads <app_data_dir>/settings.json. Missing/corrupt file => defaults, no error.
/// Never creates the file on read.
pub fn load(app: &tauri::AppHandle) -> Result<Settings, String> {
    let path = settings_path(app)?;
    match std::fs::read_to_string(&path) {
        Ok(contents) => Ok(serde_json::from_str(&contents).unwrap_or_default()),
        Err(_) => Ok(Settings::default()),
    }
}

/// Writes pretty JSON atomically (settings.json.tmp then rename), creating
/// app_data_dir if missing.
pub fn save(app: &tauri::AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let dir = path
        .parent()
        .ok_or_else(|| "save_settings: settings path has no parent dir".to_string())?;
    std::fs::create_dir_all(dir)
        .map_err(|e| format!("save_settings: cannot create app data dir: {e}"))?;

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("save_settings: cannot serialize settings: {e}"))?;

    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, json)
        .map_err(|e| format!("save_settings: cannot write temp file: {e}"))?;
    std::fs::rename(&tmp, &path)
        .map_err(|e| format!("save_settings: cannot rename temp file into place: {e}"))?;
    Ok(())
}
