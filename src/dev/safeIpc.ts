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
import type { Game, Settings } from "../types";

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

export function launchGame(path: string, emulatorApp: string): Promise<void> {
  return withDevFallback(
    () => ipc.launchGame(path, emulatorApp),
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
