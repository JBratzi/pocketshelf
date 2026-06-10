// PocketShelf IPC layer — the ONLY place `invoke` is called.
// Note: Tauri 2 maps Rust snake_case command ARGUMENTS to camelCase invoke keys
// (e.g. Rust `emulator_app` => `emulatorApp`). Struct FIELDS stay snake_case.

import { invoke } from "@tauri-apps/api/core";
import type { Game, GameStats, SaveInfo, Settings, SlotMeta } from "./types";

/** Recursively scans folders for .gba/.nds files and parses their headers. */
export async function scanLibrary(folders: string[]): Promise<Game[]> {
  return invoke<Game[]>("scan_library", { folders });
}

/** Like scanLibrary, plus individually-added loose ROM files (drag & drop). */
export async function scanPaths(
  folders: string[],
  files: string[],
): Promise<Game[]> {
  return invoke<Game[]>("scan_paths", { folders, files });
}

/** Loads persisted settings; returns defaults if none saved yet. */
export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

/** Persists settings as JSON in the app data dir. */
export async function saveSettings(settings: Settings): Promise<void> {
  return invoke<void>("save_settings", { settings });
}

/** Opens the ROM with the given macOS app and starts the playtime tracker. */
export async function launchGame(
  path: string,
  emulatorApp: string,
  gameId: string,
): Promise<void> {
  return invoke<void>("launch_game", { path, emulatorApp, gameId });
}

/** Playtime/session stats for one game; null when never played. */
export async function getStats(gameId: string): Promise<GameStats | null> {
  return invoke<GameStats | null>("get_stats", { gameId });
}

/** Live save + snapshot slots for one game. */
export async function listSaves(
  romPath: string,
  gameId: string,
): Promise<SaveInfo> {
  return invoke<SaveInfo>("list_saves", { romPath, gameId });
}

/** Snapshots the live save into a named slot. */
export async function backupSave(
  romPath: string,
  gameId: string,
  name: string,
): Promise<SlotMeta> {
  return invoke<SlotMeta>("backup_save", { romPath, gameId, name });
}

/** Copies a slot over the live save (previous live survives as .sav.bak). */
export async function restoreSave(
  romPath: string,
  gameId: string,
  fileName: string,
): Promise<void> {
  return invoke<void>("restore_save", { romPath, gameId, fileName });
}

/** Deletes a snapshot slot. Never touches the live save. */
export async function deleteSaveSlot(
  gameId: string,
  fileName: string,
): Promise<void> {
  return invoke<void>("delete_save_slot", { gameId, fileName });
}

/** Native folder picker. Resolves to null when the user cancels. */
export async function pickFolder(): Promise<string | null> {
  return invoke<string | null>("pick_folder");
}

/** Native multi-file picker filtered to .gba/.nds. Empty array on cancel. */
export async function pickRomFiles(): Promise<string[]> {
  return invoke<string[]>("pick_rom_files");
}
