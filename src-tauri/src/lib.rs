// PocketShelf — Tauri 2 backend entry. Contract: docs/architecture.md.

pub mod commands;
pub mod rom;
pub mod settings;

use commands::{get_settings, launch_game, pick_folder, save_settings, scan_library};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_library,
            get_settings,
            save_settings,
            launch_game,
            pick_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
