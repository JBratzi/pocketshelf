// PocketShelf ROM scanning — shared types and helpers.
// Contract: docs/architecture.md §3.1 (Game) and §4 (parsing spec).
// STUB: compiling placeholder. Backend implementer fills in scan() + helpers.

pub mod gba;
pub mod nds;

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

/// Walks `folders` recursively and parses every .gba/.nds file found.
/// Spec: docs/architecture.md §2.1 (skip unreadable folders, dedup by id,
/// sort by internal_title then file_name, case-insensitive).
/// STUB: returns an empty library.
pub fn scan(_folders: &[String]) -> Vec<Game> {
    Vec::new()
}
