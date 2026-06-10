// Playtime tracking — stats.json in app_data_dir, keyed by Game.id.
// Sessions are measured by polling the emulator process after launch_game;
// seconds accumulate incrementally so a crash never loses more than one tick.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::Manager;

static STATS_LOCK: Mutex<()> = Mutex::new(());

/// Poll cadence for the session tracker (also the accumulation quantum).
const POLL: Duration = Duration::from_secs(15);
/// How long to wait for the emulator process to appear after `open -a`.
const STARTUP_GRACE: Duration = Duration::from_secs(60);

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GameStats {
    /// Total accumulated play time in seconds.
    pub seconds_played: u64,
    /// Unix epoch milliseconds of the most recent launch. 0 = never.
    pub last_played: i64,
    /// Number of launches via PocketShelf.
    pub sessions: u32,
}

fn stats_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("stats: cannot resolve app data dir: {e}"))?;
    Ok(dir.join("stats.json"))
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn load(app: &tauri::AppHandle) -> HashMap<String, GameStats> {
    let path = match stats_path(app) {
        Ok(p) => p,
        Err(_) => return HashMap::new(),
    };
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn store(app: &tauri::AppHandle, map: &HashMap<String, GameStats>) -> Result<(), String> {
    let path = stats_path(app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("stats: cannot create dir: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(map).map_err(|e| format!("stats: serialize failed: {e}"))?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, json).map_err(|e| format!("stats: write failed: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("stats: rename failed: {e}"))?;
    Ok(())
}

fn mutate(app: &tauri::AppHandle, game_id: &str, f: impl FnOnce(&mut GameStats)) {
    let _guard = STATS_LOCK.lock().unwrap_or_else(|p| p.into_inner());
    let mut map = load(app);
    f(map.entry(game_id.to_string()).or_default());
    // Persistence failures are non-fatal — stats are best-effort telemetry.
    let _ = store(app, &map);
}

fn emulator_alive(process_name: &str) -> bool {
    std::process::Command::new("pgrep")
        .args(["-x", process_name])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Called by launch_game after a successful `open -a`. Registers the session
/// and spawns a detached tracker thread that accumulates play time while the
/// emulator process is alive.
pub fn track_session(app: tauri::AppHandle, game_id: String, emulator_app: String) {
    mutate(&app, &game_id, |s| {
        s.sessions += 1;
        s.last_played = now_ms();
    });

    std::thread::spawn(move || {
        // The process name of a macOS app launched via `open -a Foo` is "Foo".
        let proc_name = emulator_app.clone();
        let mut waited = Duration::ZERO;
        while !emulator_alive(&proc_name) {
            if waited >= STARTUP_GRACE {
                return; // emulator never came up — nothing to track
            }
            std::thread::sleep(Duration::from_secs(3));
            waited += Duration::from_secs(3);
        }
        while emulator_alive(&proc_name) {
            std::thread::sleep(POLL);
            mutate(&app, &game_id, |s| s.seconds_played += POLL.as_secs());
        }
    });
}
