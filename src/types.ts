// PocketShelf shared IPC types — mirrors src-tauri Rust structs.
// Field names are snake_case to match serde serialization exactly. Do not rename.

export type Platform = "gba" | "nds";

export interface Game {
  /** First 16 hex chars of SHA-256 of the absolute path. Stable list key. */
  id: string;
  /** Absolute file path. */
  path: string;
  /** File name with extension. */
  file_name: string;
  /** Factual platform descriptor derived from file extension. */
  platform: Platform;
  /** Best available title: NDS banner (EN > JA slot) > header title > file stem. */
  internal_title: string;
  /** 4-char header game code; may be "". */
  game_code: string;
  /** File size in bytes. */
  size_bytes: number;
  /** NDS only: 32x32 PNG, base64, no data-URI prefix. null for GBA or missing banner. */
  icon_png_base64: string | null;
  /** File mtime, Unix epoch milliseconds. 0 if unavailable. */
  modified_at: number;
}

export interface Settings {
  /** Absolute folder paths to scan recursively. */
  rom_folders: string[];
  /** Individual ROM files added outside any folder (drag & drop). */
  rom_files: string[];
  /** macOS application name used with `open -a` for .gba files. */
  emulator_gba: string;
  /** macOS application name used with `open -a` for .nds files. */
  emulator_nds: string;
}

export const DEFAULT_SETTINGS: Settings = {
  rom_folders: [],
  rom_files: [],
  emulator_gba: "OpenEmu",
  emulator_nds: "melonDS",
};

export interface GameStats {
  /** Total accumulated play time in seconds. */
  seconds_played: number;
  /** Unix epoch ms of most recent launch. 0 = never. */
  last_played: number;
  /** Launches via PocketShelf. */
  sessions: number;
}

export interface SlotMeta {
  file_name: string;
  size_bytes: number;
  /** Unix epoch ms. */
  modified_at: number;
}

export interface SaveInfo {
  /** Live `<rom>.sav` next to the ROM, if present. */
  live: SlotMeta | null;
  /** Named snapshots, newest first. */
  slots: SlotMeta[];
  /** melonDS quick-saves `<rom>.ml1..ml8`, in F-key order. */
  states: SlotMeta[];
}

export interface MelonStatus {
  config_found: boolean;
  keyboard_mapped: boolean;
  joystick_mapped: boolean;
}

export function iconDataUri(game: Game): string | null {
  return game.icon_png_base64
    ? `data:image/png;base64,${game.icon_png_base64}`
    : null;
}
