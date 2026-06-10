// PocketShelf IPC access for the UI.
//
// PRODUCTION PATH: every call goes straight to the real wrappers in
// src/ipc.ts (the frozen contract). Nothing else.
//
// DEV FALLBACK: when running `vite dev` in a plain browser (no Tauri
// runtime), `invoke` rejects — ONLY then, and ONLY in dev builds
// (import.meta.env.DEV), we substitute mock data from ./mockData so the UI
// stays previewable. The mock branch is dead code in production bundles.

import * as ipc from "../ipc";
import type {
  Game,
  GameStats,
  MelonStatus,
  SaveInfo,
  Settings,
  SlotMeta,
} from "../types";

function devFallbackAllowed(): boolean {
  return import.meta.env.DEV && !("__TAURI_INTERNALS__" in window);
}

async function withDevFallback<T>(real: () => Promise<T>, mock: () => Promise<T>): Promise<T> {
  try {
    return await real();
  } catch (err) {
    if (devFallbackAllowed()) {
      console.warn("[PocketShelf dev] IPC unavailable, using mock data:", err);
      return mock();
    }
    throw err;
  }
}

export function scanLibrary(folders: string[]): Promise<Game[]> {
  return withDevFallback(
    () => ipc.scanLibrary(folders),
    async () => (await import("./mockData")).MOCK_GAMES,
  );
}

export function scanPaths(folders: string[], files: string[]): Promise<Game[]> {
  return withDevFallback(
    () => ipc.scanPaths(folders, files),
    async () => (await import("./mockData")).MOCK_GAMES,
  );
}

export function getSettings(): Promise<Settings> {
  return withDevFallback(
    () => ipc.getSettings(),
    async () => (await import("./mockData")).MOCK_SETTINGS,
  );
}

export function saveSettings(settings: Settings): Promise<void> {
  return withDevFallback(
    () => ipc.saveSettings(settings),
    async () => undefined,
  );
}

export function launchGame(
  path: string,
  emulatorApp: string,
  gameId: string,
): Promise<void> {
  return withDevFallback(
    () => ipc.launchGame(path, emulatorApp, gameId),
    async () => undefined,
  );
}

export function getStats(gameId: string): Promise<GameStats | null> {
  return withDevFallback(
    () => ipc.getStats(gameId),
    async () => ({ seconds_played: 9540, last_played: 1765391000000, sessions: 7 }),
  );
}

export function listSaves(romPath: string, gameId: string): Promise<SaveInfo> {
  return withDevFallback(
    () => ipc.listSaves(romPath, gameId),
    async () => ({ live: null, slots: [], states: [] }),
  );
}

export function deleteSavestate(romPath: string, fileName: string): Promise<void> {
  return withDevFallback(
    () => ipc.deleteSavestate(romPath, fileName),
    async () => undefined,
  );
}

export function melondsStatus(): Promise<MelonStatus> {
  return withDevFallback(
    () => ipc.melondsStatus(),
    async () => ({ config_found: false, keyboard_mapped: false, joystick_mapped: false }),
  );
}

export function melondsApplyKeyboard(): Promise<string> {
  return withDevFallback(
    () => ipc.melondsApplyKeyboard(),
    async () => "15 keyboard keys mapped",
  );
}

export function melondsApplyDualsense(): Promise<string> {
  return withDevFallback(
    () => ipc.melondsApplyDualsense(),
    async () => "12 controller buttons mapped",
  );
}

export function backupSave(
  romPath: string,
  gameId: string,
  name: string,
): Promise<SlotMeta> {
  return withDevFallback(
    () => ipc.backupSave(romPath, gameId, name),
    async () => ({ file_name: `${name}.sav`, size_bytes: 512 * 1024, modified_at: 0 }),
  );
}

export function restoreSave(
  romPath: string,
  gameId: string,
  fileName: string,
): Promise<void> {
  return withDevFallback(
    () => ipc.restoreSave(romPath, gameId, fileName),
    async () => undefined,
  );
}

export function deleteSaveSlot(gameId: string, fileName: string): Promise<void> {
  return withDevFallback(
    () => ipc.deleteSaveSlot(gameId, fileName),
    async () => undefined,
  );
}

export function pickFolder(): Promise<string | null> {
  return withDevFallback(
    () => ipc.pickFolder(),
    async () => "/Users/dev/RomDumps",
  );
}

export function pickRomFiles(): Promise<string[]> {
  return withDevFallback(
    () => ipc.pickRomFiles(),
    async () => [],
  );
}
