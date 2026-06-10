// Save-slot management. The LIVE save is `<rom>.sav` next to the ROM file
// (melonDS/OpenEmu default layout). PocketShelf keeps named snapshots in
// <app_data_dir>/saves/<game_id>/*.sav and copies them over the live save
// on restore (after backing the live one up to `<rom>.sav.bak`).

use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
pub struct SlotMeta {
    pub file_name: String,
    pub size_bytes: u64,
    /// Unix epoch milliseconds.
    pub modified_at: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SaveInfo {
    /// The live `<rom>.sav` next to the ROM, if it exists.
    pub live: Option<SlotMeta>,
    /// Named snapshots, newest first.
    pub slots: Vec<SlotMeta>,
    /// melonDS quick-save states `<rom>.ml1..ml8` next to the ROM, in
    /// F-key order. file_name keeps the real name; slot number = extension.
    pub states: Vec<SlotMeta>,
}

fn live_path(rom_path: &str) -> PathBuf {
    Path::new(rom_path).with_extension("sav")
}

fn slots_dir(app: &tauri::AppHandle, game_id: &str) -> Result<PathBuf, String> {
    // game_id is a hex hash (see rom::make_id) — safe as a path segment, but
    // reject separators defensively in case a caller ever passes raw input.
    if game_id.is_empty() || game_id.contains(['/', '\\', '.']) {
        return Err("saves: invalid game id".into());
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("saves: cannot resolve app data dir: {e}"))?
        .join("saves")
        .join(game_id);
    std::fs::create_dir_all(&dir).map_err(|e| format!("saves: cannot create slots dir: {e}"))?;
    Ok(dir)
}

fn meta_of(path: &Path) -> Option<SlotMeta> {
    let meta = std::fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    let modified_at = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    Some(SlotMeta {
        file_name: path.file_name()?.to_string_lossy().into_owned(),
        size_bytes: meta.len(),
        modified_at,
    })
}

/// Slot file names come back from the frontend — never allow traversal.
fn slot_path(app: &tauri::AppHandle, game_id: &str, file_name: &str) -> Result<PathBuf, String> {
    if file_name.is_empty()
        || file_name.contains(['/', '\\'])
        || file_name.starts_with('.')
        || !file_name.ends_with(".sav")
    {
        return Err(format!("saves: invalid slot file name '{file_name}'"));
    }
    Ok(slots_dir(app, game_id)?.join(file_name))
}

/// Keep slot names human but filesystem-safe.
fn sanitize_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, ' ' | '-' | '_'))
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "save".to_string()
    } else {
        trimmed.chars().take(40).collect()
    }
}

pub fn list(app: &tauri::AppHandle, rom_path: &str, game_id: &str) -> Result<SaveInfo, String> {
    let live = meta_of(&live_path(rom_path));
    let mut slots: Vec<SlotMeta> = std::fs::read_dir(slots_dir(app, game_id)?)
        .map_err(|e| format!("saves: cannot read slots dir: {e}"))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|x| x == "sav"))
        .filter_map(|e| meta_of(&e.path()))
        .collect();
    slots.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    let states = (1..=8)
        .filter_map(|i| meta_of(&Path::new(rom_path).with_extension(format!("ml{i}"))))
        .collect();
    Ok(SaveInfo { live, slots, states })
}

/// Deletes one melonDS quick-save state. `file_name` must be exactly one of
/// the `<rom>.ml1..ml8` siblings — anything else is rejected.
pub fn delete_state(rom_path: &str, file_name: &str) -> Result<(), String> {
    let valid = (1..=8).any(|i| {
        Path::new(rom_path)
            .with_extension(format!("ml{i}"))
            .file_name()
            .is_some_and(|n| n.to_string_lossy() == file_name)
    });
    if !valid {
        return Err(format!("saves: '{file_name}' is not a quick-save of this game"));
    }
    let path = Path::new(rom_path).with_file_name(file_name);
    if !path.is_file() {
        return Err(format!("saves: quick-save '{file_name}' not found"));
    }
    std::fs::remove_file(&path).map_err(|e| format!("saves: delete failed: {e}"))?;
    Ok(())
}

pub fn backup(
    app: &tauri::AppHandle,
    rom_path: &str,
    game_id: &str,
    name: &str,
) -> Result<SlotMeta, String> {
    let live = live_path(rom_path);
    if !live.is_file() {
        return Err("No save file yet — play the game first, then back it up.".into());
    }
    let dir = slots_dir(app, game_id)?;
    let base = sanitize_name(name);
    let mut dest = dir.join(format!("{base}.sav"));
    let mut n = 2;
    while dest.exists() {
        dest = dir.join(format!("{base}-{n}.sav"));
        n += 1;
    }
    std::fs::copy(&live, &dest).map_err(|e| format!("saves: backup copy failed: {e}"))?;
    meta_of(&dest).ok_or_else(|| "saves: backup vanished after copy".into())
}

pub fn restore(
    app: &tauri::AppHandle,
    rom_path: &str,
    game_id: &str,
    file_name: &str,
) -> Result<(), String> {
    let slot = slot_path(app, game_id, file_name)?;
    if !slot.is_file() {
        return Err(format!("saves: slot '{file_name}' not found"));
    }
    let live = live_path(rom_path);
    // Safety net: the live save being overwritten survives as `.sav.bak`.
    if live.is_file() {
        let bak = Path::new(rom_path).with_extension("sav.bak");
        std::fs::copy(&live, &bak).map_err(|e| format!("saves: live backup failed: {e}"))?;
    }
    std::fs::copy(&slot, &live).map_err(|e| format!("saves: restore copy failed: {e}"))?;
    Ok(())
}

/// How many `auto ` snapshots to keep per game (newest wins).
const AUTO_KEEP: usize = 5;

/// Post-session snapshot, called by the playtime tracker when the emulator
/// exits. Skips when the live save was not touched during the session (the
/// user opened and closed without saving). Prunes old auto slots.
pub fn auto_backup(
    app: &tauri::AppHandle,
    rom_path: &str,
    game_id: &str,
    session_start_ms: i64,
) -> Result<Option<SlotMeta>, String> {
    let live = live_path(rom_path);
    let Some(live_meta) = meta_of(&live) else {
        return Ok(None); // no save file — nothing to snapshot
    };
    if live_meta.modified_at <= session_start_ms {
        return Ok(None); // save untouched this session
    }

    // "auto 2026-06-10 15h32" — chrono-free local timestamp via `date`.
    let stamp = std::process::Command::new("date")
        .arg("+%Y-%m-%d %Hh%M")
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("ts {}", live_meta.modified_at));
    let slot = backup(app, rom_path, game_id, &format!("auto {stamp}"))?;

    // Prune: keep the newest AUTO_KEEP auto snapshots.
    let mut autos: Vec<SlotMeta> = list(app, rom_path, game_id)?
        .slots
        .into_iter()
        .filter(|s| s.file_name.starts_with("auto "))
        .collect();
    autos.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    for old in autos.into_iter().skip(AUTO_KEEP) {
        let _ = delete_slot(app, game_id, &old.file_name);
    }
    Ok(Some(slot))
}

pub fn delete_slot(app: &tauri::AppHandle, game_id: &str, file_name: &str) -> Result<(), String> {
    let slot = slot_path(app, game_id, file_name)?;
    if !slot.is_file() {
        return Err(format!("saves: slot '{file_name}' not found"));
    }
    std::fs::remove_file(&slot).map_err(|e| format!("saves: delete failed: {e}"))?;
    Ok(())
}
