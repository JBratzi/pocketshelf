// PocketShelf ROM scanning — shared types and helpers.
// Contract: docs/architecture.md §3.1 (Game) and §4 (parsing spec).

pub mod gba;
pub mod nds;

use std::collections::HashSet;
use std::path::Path;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;

/// Files larger than this are skipped by the scanner (robustness guard).
const MAX_FILE_SIZE: u64 = 512 * 1024 * 1024; // 512 MB

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
/// Spec: docs/architecture.md §2.1 — no symlink following, hidden files
/// skipped, unreadable folders/files skipped silently, dedup by id (first
/// occurrence wins), sorted by internal_title then file_name (both
/// case-insensitive). Never panics; per-file errors mean skip.
pub fn scan(folders: &[String]) -> Vec<Game> {
    scan_paths(folders, &[])
}

/// Parses a single candidate path: must be a regular file with a .gba/.nds
/// extension within the size guard. Any failure means None (skip-on-error).
fn parse_file(path: &Path) -> Option<Game> {
    let ext = path.extension().and_then(|e| e.to_str())?.to_ascii_lowercase();
    if ext != "gba" && ext != "nds" {
        return None;
    }
    let meta = std::fs::metadata(path).ok()?;
    if !meta.is_file() || meta.len() > MAX_FILE_SIZE {
        return None;
    }
    match ext.as_str() {
        "gba" => gba::parse_gba(path),
        "nds" => nds::parse_nds(path),
        _ => unreachable!(),
    }
}

/// Content-identity key: two copies of the same dump anywhere on disk must
/// collapse into one shelf entry. Falls back to the path id when the header
/// carried no game code (homebrew, corrupt header).
fn dedup_key(g: &Game) -> String {
    if g.game_code.is_empty() {
        g.id.clone()
    } else {
        format!(
            "{}:{}:{}:{}",
            g.platform,
            g.game_code,
            g.internal_title.to_lowercase(),
            g.size_bytes
        )
    }
}

/// Like `scan`, plus individually-added `files` (drag & drop). Loose files
/// skip the hidden-name filter — an explicit add is an explicit intent.
/// Same dedup and sort guarantees as `scan` (content identity, first wins).
pub fn scan_paths(folders: &[String], files: &[String]) -> Vec<Game> {
    let mut seen: HashSet<String> = HashSet::new();
    let mut games: Vec<Game> = Vec::new();

    for folder in folders {
        let walker = WalkDir::new(folder)
            .follow_links(false)
            .into_iter()
            // Skip hidden files AND hidden directories (depth 0 = the root
            // folder itself, always allowed even if its name starts with '.').
            .filter_entry(|e| e.depth() == 0 || !is_hidden_name(e.file_name()))
            // Unreadable entries (and non-existent roots) are skipped silently.
            .filter_map(|e| e.ok());

        for entry in walker {
            if !entry.file_type().is_file() {
                continue;
            }
            if let Some(g) = parse_file(entry.path()) {
                if seen.insert(dedup_key(&g)) {
                    games.push(g);
                }
            }
        }
    }

    for file in files {
        if let Some(g) = parse_file(Path::new(file)) {
            if seen.insert(dedup_key(&g)) {
                games.push(g);
            }
        }
    }

    games.sort_by(|a, b| {
        a.internal_title
            .to_lowercase()
            .cmp(&b.internal_title.to_lowercase())
            .then_with(|| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()))
    });
    games
}

fn is_hidden_name(name: &std::ffi::OsStr) -> bool {
    name.to_string_lossy().starts_with('.')
}

/// First 16 hex chars of SHA-256 of the path's UTF-8 bytes (§3.1).
pub(crate) fn make_id(path: &str) -> String {
    let digest = Sha256::digest(path.as_bytes());
    hex::encode(digest)[..16].to_string()
}

/// Shared ASCII field decoding (§4): truncate at first NUL, keep only
/// printable ASCII 0x20..=0x7E, trim whitespace.
pub(crate) fn decode_ascii(bytes: &[u8]) -> String {
    let end = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
    let s: String = bytes[..end]
        .iter()
        .filter(|&&b| (0x20..=0x7E).contains(&b))
        .map(|&b| b as char)
        .collect();
    s.trim().to_string()
}

/// File name without extension; empty string if unavailable.
pub(crate) fn file_stem(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// File name with extension; empty string if unavailable.
pub(crate) fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// File mtime as Unix epoch milliseconds; 0 if unavailable.
pub(crate) fn modified_ms(meta: &std::fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn scan_skips_hidden_and_junk_and_sorts() {
        let dir = std::env::temp_dir().join(format!("pocketshelf-scan-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        // Valid GBA file, title "BETA".
        let mut rom_b = vec![0u8; 0x200];
        rom_b[0xA0..0xA4].copy_from_slice(b"BETA");
        fs::write(dir.join("b.gba"), &rom_b).unwrap();

        // Valid GBA file, title "ALPHA" — must sort first.
        let mut rom_a = vec![0u8; 0x200];
        rom_a[0xA0..0xA5].copy_from_slice(b"ALPHA");
        fs::write(dir.join("a.gba"), &rom_a).unwrap();

        // Hidden file: skipped.
        fs::write(dir.join(".hidden.gba"), &rom_a).unwrap();
        // Truncated file: skipped, must not panic the scan.
        fs::write(dir.join("tiny.gba"), [0u8; 16]).unwrap();
        // Wrong extension: skipped.
        fs::write(dir.join("notes.txt"), b"not a rom").unwrap();
        // Non-existent folder in the same scan: skipped silently.
        let missing = dir.join("does-not-exist").to_string_lossy().into_owned();

        let games = scan(&[dir.to_string_lossy().into_owned(), missing]);
        assert_eq!(games.len(), 2);
        assert_eq!(games[0].internal_title, "ALPHA");
        assert_eq!(games[1].internal_title, "BETA");
        assert_eq!(games[0].id.len(), 16);

        let _ = fs::remove_dir_all(&dir);
    }
}
