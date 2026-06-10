// PocketShelf Tauri commands — the IPC contract surface.
// Signatures are FROZEN per docs/architecture.md §2. Bodies are thin: they
// delegate to rom/ and settings.

use tauri_plugin_dialog::DialogExt;

use crate::rom::{self, Game};
use crate::settings::{self, Settings};

/// §2.1 — recursive scan of `folders` for .gba/.nds files.
/// Per-file/per-folder errors never fail the whole scan (skip-on-error).
#[tauri::command]
pub async fn scan_library(folders: Vec<String>) -> Result<Vec<Game>, String> {
    // Walking + header parsing is blocking I/O; keep it off the async runtime.
    tauri::async_runtime::spawn_blocking(move || rom::scan(&folders))
        .await
        .map_err(|e| format!("scan_library: scan task failed: {e}"))
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
    if !std::path::Path::new(&path).exists() {
        return Err(format!("launch_game: file '{path}' not found"));
    }
    let output = std::process::Command::new("open")
        .args(["-a", &emulator_app, &path])
        .output()
        .map_err(|e| format!("launch_game: failed to run 'open': {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "launch_game: emulator app '{}' failed to open: {}",
            emulator_app,
            stderr.trim()
        ));
    }
    Ok(())
}

/// §2.5 — Rust-side native folder picker (tauri-plugin-dialog).
/// Ok(None) on user cancel.
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    // blocking_pick_folder blocks; run it off the async runtime thread.
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog().file().blocking_pick_folder()
    })
    .await
    .map_err(|e| format!("pick_folder: dialog task failed: {e}"))?;

    match picked {
        None => Ok(None),
        Some(file_path) => file_path
            .into_path()
            .map(|p| Some(p.to_string_lossy().into_owned()))
            .map_err(|e| format!("pick_folder: invalid folder path: {e}")),
    }
}
