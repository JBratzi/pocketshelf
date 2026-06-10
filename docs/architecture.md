# PocketShelf — Architecture & IPC Contract

**Status:** FROZEN contract v1. Backend and frontend engineers build in parallel against this document. Any deviation requires updating this file first.

**Stack:** Tauri 2 (Rust backend) + React 18 + TypeScript + Vite + Tailwind CSS v4 + `motion` (framer-motion successor).

**Scope:** macOS-native ROM library manager for `.gba` and `.nds` files the user already owns (own cartridge dumps). PocketShelf never downloads, links to, or distributes ROMs.

**Legal hard rules (apply to ALL code, copy, and assets):** no Nintendo logos; no Nintendo trademark names in branding or stylized UI copy (the words "GBA" / "NDS" / "Game Boy Advance" / "Nintendo DS" may appear only as plain factual platform descriptors, e.g. a platform badge label); no Pokemon assets or names anywhere (including test fixtures and sample data); no recreation of Switch/eShop/DS trade dress; no Nintendo fonts or sound effects; no links to ROM sites; no piracy facilitation. README must carry a clear legal disclaimer.

---

## 1. High-level design

```
┌────────────────────────────┐        invoke (IPC)        ┌─────────────────────────────┐
│ React 18 frontend (Vite)   │ ─────────────────────────▶ │ Rust backend (Tauri 2)      │
│  - LibraryContext          │ ◀───────────────────────── │  - commands.rs (5 commands) │
│    (useReducer)            │     JSON (serde)           │  - rom/gba.rs, rom/nds.rs   │
│  - localStorage cache      │                            │  - settings.rs (JSON file)  │
└────────────────────────────┘                            └─────────────────────────────┘
```

- Backend is **stateless** between calls except for `settings.json` on disk. The library is recomputed on every `scan_library` call; the frontend caches it in `localStorage` for instant boot.
- All IPC payloads use **snake_case field names** on structs (serde default, no `rename_all`). TS types mirror snake_case exactly.
- **Command argument names** follow Tauri 2's default convention: Rust snake_case parameters are invoked from JS with **camelCase keys** (e.g. Rust `emulator_app` ⇒ JS `{ emulatorApp }`). Struct *fields* are NOT converted — only top-level invoke argument keys. `ipc.ts` (§8.2) encodes this correctly; frontend must use `ipc.ts` only, never raw `invoke`.
- All commands return `Result<T, String>`. On `Err`, the frontend promise **rejects** with the string. Error strings are human-readable English, prefixed with context, e.g. `"launch_game: emulator app 'melonDS' not found"`.

---

## 2. Tauri commands (the contract)

Registered in `lib.rs` via `tauri::generate_handler![scan_library, get_settings, save_settings, launch_game, pick_folder]`.

### 2.1 `scan_library`

```rust
#[tauri::command]
pub async fn scan_library(folders: Vec<String>) -> Result<Vec<Game>, String>
```

TS: `scanLibrary(folders: string[]): Promise<Game[]>` — `invoke("scan_library", { folders })`

Behavior:
- Walks each folder **recursively** with the `walkdir` crate. Follows no symlinks (`follow_links(false)`). Non-existent / unreadable folders are **skipped silently** (do not error the whole scan).
- Selects files whose extension is `gba` or `nds` (case-insensitive). Hidden files (name starting with `.`) are skipped.
- Parses each file's header per §4. A file that fails minimum-size validation is skipped. A file whose *icon* fails to decode is still included with `icon_png_base64 = None`.
- **Dedup** by `id` (first occurrence wins, in walk order).
- Returns games **sorted** by `internal_title` case-insensitive ascending; ties broken by `file_name` case-insensitive ascending.
- Empty `folders` ⇒ `Ok(vec![])`.

### 2.2 `get_settings`

```rust
#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<Settings, String>
```

TS: `getSettings(): Promise<Settings>` — `invoke("get_settings")`

Behavior: reads `<app_data_dir>/settings.json` (via `app.path().app_data_dir()`). If the file does not exist or fails to parse, returns the **default settings** (§3.2) without erroring. Never creates the file on read.

### 2.3 `save_settings`

```rust
#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String>
```

TS: `saveSettings(settings: Settings): Promise<void>` — `invoke("save_settings", { settings })`

Behavior: creates `app_data_dir` if missing (`std::fs::create_dir_all`), writes pretty-printed JSON to `<app_data_dir>/settings.json` atomically (write to `settings.json.tmp`, then rename).

### 2.4 `launch_game`

```rust
#[tauri::command]
pub fn launch_game(path: String, emulator_app: String) -> Result<(), String>
```

TS: `launchGame(path: string, emulatorApp: string): Promise<void>` — `invoke("launch_game", { path, emulatorApp })` ← note camelCase key.

Behavior: macOS only. Runs `std::process::Command::new("open").args(["-a", &emulator_app, &path])`. Validates first that `path` exists (`Err` if not). If `open` exits non-zero, returns `Err` including stderr (this is how a missing emulator app surfaces). No shell interpolation — args passed as discrete argv entries (no injection risk).

### 2.5 `pick_folder`

```rust
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String>
```

TS: `pickFolder(): Promise<string | null>` — `invoke("pick_folder")`

Behavior: uses `tauri-plugin-dialog` (Rust-side API: `app.dialog().file().blocking_pick_folder()` inside the async command, or the callback API resolved via a channel). Returns `Ok(None)` when the user cancels; `Ok(Some(absolute_path))` otherwise. Because the dialog is opened from Rust, **no JS capability permission is needed**, but the plugin must be registered in `lib.rs`: `.plugin(tauri_plugin_dialog::init())`.

---

## 3. Data structures

### 3.1 `Game` (Rust — `src-tauri/src/rom/mod.rs`)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    /// SHA-256 hex digest of the absolute path's UTF-8 bytes, truncated to the
    /// first 16 hex chars. Stable across rescans as long as the path is stable.
    pub id: String,
    /// Absolute file path.
    pub path: String,
    /// File name with extension, e.g. "my-dump.gba".
    pub file_name: String,
    /// "gba" | "nds" (lowercase, derived from extension). Factual platform
    /// descriptor only — never stylized in UI as branding.
    pub platform: String,
    /// Header internal title (§4). Falls back to the file stem if empty after trimming.
    pub internal_title: String,
    /// 4-char header game code (§4). May be empty if non-printable.
    pub game_code: String,
    /// File size in bytes.
    pub size_bytes: u64,
    /// NDS only: 32x32 RGBA icon encoded as PNG, base64 (standard alphabet, padded),
    /// NO data-URI prefix. Always None for GBA. None if banner missing/invalid.
    pub icon_png_base64: Option<String>,
    /// File mtime as Unix epoch MILLISECONDS (i64). 0 if unavailable.
    pub modified_at: i64,
}
```

`id` reference impl: `let d = sha2::Sha256::digest(path.as_bytes()); hex::encode(d)[..16].to_string()` (crates: `sha2`, `hex`).

### 3.2 `Settings` (Rust — `src-tauri/src/settings.rs`)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// Absolute paths of folders to scan.
    pub rom_folders: Vec<String>,
    /// macOS app name passed to `open -a`, e.g. "OpenEmu".
    pub emulator_gba: String,
    /// macOS app name passed to `open -a`, e.g. "melonDS".
    pub emulator_nds: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            rom_folders: Vec::new(),
            emulator_gba: "OpenEmu".to_string(),
            emulator_nds: "OpenEmu".to_string(),
        }
    }
}
```

`#[serde(default)]` makes settings forward-compatible: missing fields are defaulted on read.

---

## 4. ROM parsing spec (`src-tauri/src/rom/`)

Shared rules (both platforms):
- Read only the bytes needed (open file, seek + `read_exact` at offsets) — do NOT load whole ROMs into memory (NDS files can be 512 MB).
- **String decoding (ASCII fields):** take the fixed-size byte slice, truncate at the first `0x00`, keep only printable ASCII `0x20..=0x7E` (drop others), trim whitespace. If the result is empty ⇒ fall back as documented per field.

### 4.1 GBA (`rom/gba.rs`)

Minimum file size: `0xB0` (176) bytes; smaller files are skipped by the scanner.

| Field          | Offset | Size | Encoding                        |
|----------------|--------|------|---------------------------------|
| Internal title | `0xA0` | 12 B | ASCII, NUL-padded               |
| Game code      | `0xAC` | 4 B  | ASCII (typically 4 uppercase)   |

- `internal_title`: decode per shared rules; empty ⇒ file stem (file name without extension).
- `game_code`: decode per shared rules; empty stays `""`.
- `icon_png_base64`: always `None` (the GBA header has no icon).

### 4.2 NDS (`rom/nds.rs`)

Minimum file size: `0x160` (352) bytes; smaller files are skipped.

**Header:**

| Field         | Offset | Size | Encoding                  |
|---------------|--------|------|---------------------------|
| Title         | `0x00` | 12 B | ASCII, NUL-padded         |
| Game code     | `0x0C` | 4 B  | ASCII                     |
| Banner offset | `0x68` | 4 B  | `u32` little-endian       |

**Banner** (at absolute file offset `banner_offset`; if `banner_offset == 0` or `banner_offset + 0x440 > file_size`, there is no usable banner ⇒ `icon_png_base64 = None`, header title used):

| Field                  | Offset (rel. to banner) | Size  | Encoding |
|------------------------|--------------------------|-------|----------|
| Icon bitmap            | `+0x20`                  | 512 B | 4bpp tiled (below) |
| Icon palette           | `+0x220`                 | 32 B  | 16 × `u16` LE, BGR555 |
| Title (slot 0, JA)     | `+0x240`                 | 256 B | UTF-16LE, NUL-terminated |
| Title (slot 1, EN)     | `+0x340`                 | 256 B | UTF-16LE, NUL-terminated |

**Title precedence for `internal_title`:** banner English slot (`+0x340`) if non-empty after decoding ⇒ else banner slot `+0x240` ⇒ else header ASCII title ⇒ else file stem. Banner titles: decode 128 `u16` LE code units, truncate at first `0x0000`, `String::from_utf16_lossy`, then take **only the first line** (split on `'\n'`; banner titles are typically "Title\nSubtitle\nPublisher") and trim.

**Icon decode (4bpp tiled → 32×32 RGBA PNG):**

1. The 512-byte bitmap is a **4×4 grid of 8×8-pixel tiles**, stored tile-by-tile row-major (tile 0 = top-left, tile 3 = top-right, tile 4 = second tile-row left, …). Each tile is 32 bytes = 64 pixels.
2. Within a tile, pixels are row-major. Each byte holds **two pixels**: low nibble = left/first pixel, high nibble = right/second pixel. Pixel value = palette index `0..=15`.
3. For pixel `(x, y)` in the 32×32 image: `tile = (y / 8) * 4 + (x / 8)`, `in_tile = (y % 8) * 8 + (x % 8)`, `byte = bitmap[tile * 32 + in_tile / 2]`, `index = if in_tile % 2 == 0 { byte & 0x0F } else { byte >> 4 }`.
4. Palette: 16 `u16` LE values, **BGR555**: `r5 = v & 0x1F`, `g5 = (v >> 5) & 0x1F`, `b5 = (v >> 10) & 0x1F`. Expand 5→8 bits: `c8 = (c5 << 3) | (c5 >> 2)`.
5. **Palette index 0 is fully transparent** (`rgba = [0, 0, 0, 0]`); all other indices are opaque (`a = 255`).
6. Encode the 32×32 RGBA buffer as PNG (crate: `png`, color type RGBA, 8-bit depth), then base64 (crate: `base64`, `STANDARD` engine). Result has no `data:` prefix; the frontend prepends `data:image/png;base64,`.
7. Any failure in steps 1–6 (short reads, bad offset) ⇒ `icon_png_base64 = None`; never fail the scan.

**Backend crates:** `walkdir`, `serde`, `serde_json`, `sha2`, `hex`, `base64`, `png`, `tauri-plugin-dialog`.

**Unit tests** (`rom/gba.rs`, `rom/nds.rs`): build synthetic ROMs in tests (temp files with crafted headers/banners using generic titles like `"TESTGAME"` — per legal rules, never real commercial titles) and assert title/code/icon decode, including: NUL-padded titles, banner offset 0, truncated banner, transparency of palette index 0.

---

## 5. Settings persistence

- Location: `app.path().app_data_dir()?.join("settings.json")` — on macOS resolves under `~/Library/Application Support/<bundle-id>/`.
- Format: pretty JSON of `Settings` (snake_case keys): `{ "rom_folders": [], "emulator_gba": "OpenEmu", "emulator_nds": "OpenEmu" }`.
- Backend is the SSOT for settings. The frontend never treats localStorage as settings authority — it calls `get_settings` on boot and `save_settings` on change.

---

## 6. Frontend state

**Decision: plain React Context + `useReducer`** (no zustand — one store, small app, fewer deps).

- `src/store.tsx` exports `LibraryProvider` + `useLibrary()` hook.
- State shape:

```ts
interface AppState {
  games: Game[];
  settings: Settings;
  status: "booting" | "idle" | "scanning" | "error";
  error: string | null;        // last scan/launch error, shown as toast/banner
  lastScanAt: number | null;   // epoch ms
}
```

- Reducer actions: `HYDRATE` (from localStorage + `getSettings()` on boot), `SCAN_START`, `SCAN_SUCCESS { games }`, `SCAN_ERROR { message }`, `SET_SETTINGS { settings }`, `CLEAR_ERROR`.
- **localStorage cache** (instant boot): key `pocketshelf.library.v1` ⇒ `JSON.stringify({ games, lastScanAt })`. On boot: hydrate games from cache synchronously, call `getSettings()`, then **rescan on demand only** (user presses Rescan; plus one auto-rescan on boot if the cache is empty and `rom_folders` is non-empty). After every successful scan, rewrite the cache. Corrupt cache ⇒ ignore and remove the key.
- Derived UI state (search query, platform filter, selected game) stays in component state — not in the reducer, not persisted.
- Icons: use `iconDataUri(game)` from `types.ts`; when `null` (all GBA, some NDS), render a neutral original-design placeholder (own CSS/SVG cartridge silhouette — no Nintendo trade dress).

---

## 7. File layout

```
src-tauri/
  src/
    main.rs            # fn main() { pocketshelf_lib::run() }
    lib.rs             # tauri::Builder, plugin registration (dialog), generate_handler!
    commands.rs        # the 5 #[tauri::command] fns (thin: delegate to rom/ and settings)
    rom/
      mod.rs           # pub struct Game; scan(folders) -> Vec<Game>; shared helpers (id, ascii decode)
      gba.rs           # parse_gba(path) -> Option<Game>
      nds.rs           # parse_nds(path) -> Option<Game> (header + banner + icon PNG)
    settings.rs        # pub struct Settings; load(app) / save(app, settings)
  capabilities/default.json   # core defaults only; Rust-side dialog needs no extra perms
src/
  main.tsx             # React root, wraps <App/> in <LibraryProvider>
  App.tsx              # layout: Toolbar + Shelf | SettingsPanel
  types.ts             # VERBATIM from §8.1 — shared contract
  ipc.ts               # VERBATIM from §8.2 — shared contract
  store.tsx            # LibraryProvider + useLibrary (context + useReducer, §6)
  components/
    Toolbar.tsx        # search input, platform filter, Rescan button, settings toggle
    Shelf.tsx          # responsive game grid (motion layout animations)
    GameCard.tsx       # icon/placeholder, title, platform badge, size; click → launch
    SettingsPanel.tsx  # folder list (+ pickFolder), emulator app name inputs, save
    EmptyState.tsx     # no folders / no games guidance
  styles/
    index.css          # Tailwind v4 entry (@import "tailwindcss") + theme tokens
```

---

## 8. Shared contract files (VERBATIM — scaffolder creates these exactly)

### 8.1 `src/types.ts`

```ts
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
  /** macOS application name used with `open -a` for .gba files. */
  emulator_gba: string;
  /** macOS application name used with `open -a` for .nds files. */
  emulator_nds: string;
}

export const DEFAULT_SETTINGS: Settings = {
  rom_folders: [],
  emulator_gba: "OpenEmu",
  emulator_nds: "OpenEmu",
};

export function iconDataUri(game: Game): string | null {
  return game.icon_png_base64
    ? `data:image/png;base64,${game.icon_png_base64}`
    : null;
}
```

### 8.2 `src/ipc.ts`

```ts
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
```

---

## 9. Parallel-build checklist

- **Backend engineer** implements §2–§5 + §7 (`src-tauri/`), treating §8 as the wire truth; ships `cargo test` unit tests for §4 with synthetic fixtures.
- **Frontend engineer** implements §6–§8 (`src/`), importing only from `ipc.ts`; can develop against a mock of `ipc.ts` (same signatures) before the backend lands.
- Neither side renames a field, command, or argument without editing this file in the same change.
- Environment note: prefix any cargo/rustc invocation with `export PATH="$HOME/.local/share/mise/shims:$PATH"` (Rust via mise shims).
