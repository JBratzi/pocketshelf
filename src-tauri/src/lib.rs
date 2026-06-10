// PocketShelf — Tauri 2 backend entry. Contract: docs/architecture.md.

pub mod commands;
pub mod rom;
pub mod saves;
pub mod settings;
pub mod stats;

use commands::{
    backup_save, delete_save_slot, get_settings, get_stats, launch_game, list_saves, pick_folder,
    pick_rom_files, restore_save, save_settings, scan_library, scan_paths,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_library,
            scan_paths,
            get_settings,
            save_settings,
            launch_game,
            pick_folder,
            pick_rom_files,
            get_stats,
            list_saves,
            backup_save,
            restore_save,
            delete_save_slot
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
