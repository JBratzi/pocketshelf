// PocketShelf IPC layer — the ONLY place `invoke` is called.
// Note: Tauri 2 maps Rust snake_case command ARGUMENTS to camelCase invoke keys
// (e.g. Rust `emulator_app` => `emulatorApp`). Struct FIELDS stay snake_case.

import { invoke } from "@tauri-apps/api/core";
import type { Game, Settings } from "./types";

/** Recursively scans folders for .gba/.nds files and parses their headers. */
export async function scanLibrary(folders: string[]): Promise<Game[]> {
  return invoke<Game[]>("scan_library", { folders });
}

/** Loads persisted settings; returns defaults if none saved yet. */
export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

/** Persists settings as JSON in the app data dir. */
export async function saveSettings(settings: Settings): Promise<void> {
  return invoke<void>("save_settings", { settings });
}

/** Opens the ROM with the given macOS app via `open -a <app> <path>`. */
export async function launchGame(
  path: string,
  emulatorApp: string,
): Promise<void> {
  return invoke<void>("launch_game", { path, emulatorApp });
}

/** Native folder picker. Resolves to null when the user cancels. */
export async function pickFolder(): Promise<string | null> {
  return invoke<string | null>("pick_folder");
}
