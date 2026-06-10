// PocketShelf Tauri commands — the IPC contract surface.
// Signatures are FROZEN per docs/architecture.md §2. Bodies are thin: they
// delegate to rom/ and settings. STUB: compiling placeholders returning
// defaults; backend implementer fills in behavior without changing signatures.

use crate::rom::{self, Game};
use crate::settings::{self, Settings};

/// §2.1 — recursive scan of `folders` for .gba/.nds files.
#[tauri::command]
pub async fn scan_library(folders: Vec<String>) -> Result<Vec<Game>, String> {
    Ok(rom::scan(&folders))
}

/// §2.2 — read settings.json; defaults if missing/corrupt.
#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    settings::load(&app)
}

/// §2.3 — atomic pretty-JSON write of settings.json.
#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    settings::save(&app, &settings)
}

/// §2.4 — `open -a <emulator_app> <path>` (macOS). Discrete argv, no shell.
/// JS invokes with camelCase key: { path, emulatorApp }.
#[tauri::command]
pub fn launch_game(path: String, emulator_app: String) -> Result<(), String> {
    let _ = (&path, &emulator_app); // STUB: implementer replaces body (§2.4).
    Ok(())
}

/// §2.5 — Rust-side native folder picker (tauri-plugin-dialog).
/// Ok(None) on user cancel. STUB: always returns Ok(None).
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let _ = &app; // STUB: implementer uses app.dialog().file() (§2.5).
    Ok(None)
}
