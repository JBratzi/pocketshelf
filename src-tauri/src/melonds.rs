// melonDS config integration — patches ~/Library/Preferences/melonDS/melonDS.toml
// (schema observed from melonDS 1.1). Line-based patching on purpose: it
// preserves unknown keys, comments and the binary Geometry blob, instead of
// re-serializing the whole file. A .bak copy is written before every patch.
//
// Keyboard values are Qt key codes; joystick values use melonDS's encoding
// (verified in EmuInstanceInput.cpp): plain button = index, hat = 0x100 |
// direction (1 up, 2 right, 4 down, 8 left), axis = 0x10000 | dir<<20 |
// axis<<24. The DualSense mapping below assumes SDL's hidapi driver (the
// default in modern SDL2), where the d-pad arrives as buttons 11-14.

use std::path::PathBuf;

use serde::Serialize;

const KEYBOARD_SECTION: &str = "[Instance0.Keyboard]";
const JOYSTICK_SECTION: &str = "[Instance0.Joystick]";

/// Recommended keyboard layout (matches the in-app tutorial):
/// Arrows = D-pad · X=A · Z=B · S=X · A=Y · Q=L · W=R · Enter=Start ·
/// Shift=Select · Tab=fast-forward · F11=fullscreen · P=pause.
const KEYBOARD_MAP: &[(&str, i64)] = &[
    ("Up", 16777235),    // Qt::Key_Up
    ("Down", 16777237),  // Qt::Key_Down
    ("Left", 16777234),  // Qt::Key_Left
    ("Right", 16777236), // Qt::Key_Right
    ("A", 88),           // X key
    ("B", 90),           // Z key
    ("X", 83),           // S key
    ("Y", 65),           // A key
    ("L", 81),           // Q key
    ("R", 87),           // W key
    ("Start", 16777220),  // Return
    ("Select", 16777248), // Shift
    ("HK_FastForward", 16777217),     // Tab (hold)
    ("HK_FullscreenToggle", 16777274), // F11
    ("HK_Pause", 80),                  // P
];

/// Sony DualSense via SDL hidapi: cross=0 circle=1 square=2 triangle=3
/// create=4 PS=5 options=6 L3=7 R3=8 L1=9 R1=10 dpad up/down/left/right=11-14.
/// DS layout: A=east(circle), B=south(cross), X=north(triangle), Y=west(square).
const DUALSENSE_MAP: &[(&str, i64)] = &[
    ("A", 1),  // circle
    ("B", 0),  // cross
    ("X", 3),  // triangle
    ("Y", 2),  // square
    ("L", 9),  // L1
    ("R", 10), // R1
    ("Select", 4), // create
    ("Start", 6),  // options
    ("Up", 11),
    ("Down", 12),
    ("Left", 13),
    ("Right", 14),
];

#[derive(Debug, Clone, Serialize)]
pub struct MelonStatus {
    pub config_found: bool,
    pub keyboard_mapped: bool,
    pub joystick_mapped: bool,
}

fn config_path() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "melonds: cannot resolve $HOME".to_string())?;
    Ok(PathBuf::from(home).join("Library/Preferences/melonDS/melonDS.toml"))
}

fn read_config() -> Result<String, String> {
    let path = config_path()?;
    std::fs::read_to_string(&path).map_err(|_| {
        "melonDS config not found — open melonDS once (any game) and try again.".to_string()
    })
}

/// Replaces `Key = value` lines inside one `[section]`. Returns the patched
/// content and how many keys were actually rewritten.
fn patch_section(content: &str, section: &str, values: &[(&str, i64)]) -> (String, usize) {
    let mut out: Vec<String> = Vec::with_capacity(content.lines().count() + 1);
    let mut in_section = false;
    let mut patched = 0;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            in_section = trimmed == section;
            out.push(line.to_string());
            continue;
        }
        if in_section {
            if let Some((key, _)) = line.split_once('=') {
                let k = key.trim();
                if let Some((_, v)) = values.iter().find(|(name, _)| *name == k) {
                    out.push(format!("{k} = {v}"));
                    patched += 1;
                    continue;
                }
            }
        }
        out.push(line.to_string());
    }
    (out.join("\n") + "\n", patched)
}

fn section_key_value(content: &str, section: &str, key: &str) -> Option<i64> {
    let mut in_section = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') {
            in_section = trimmed == section;
            continue;
        }
        if in_section {
            if let Some((k, v)) = trimmed.split_once('=') {
                if k.trim() == key {
                    return v.trim().parse().ok();
                }
            }
        }
    }
    None
}

fn write_config(content: &str) -> Result<(), String> {
    let path = config_path()?;
    // Refuse to patch while melonDS runs — it rewrites the file on quit and
    // would silently revert everything we just wrote.
    let running = std::process::Command::new("pgrep")
        .args(["-x", "melonDS"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if running {
        return Err("Quit melonDS first — it overwrites its config on exit.".into());
    }
    let bak = path.with_extension("toml.bak");
    std::fs::copy(&path, &bak).map_err(|e| format!("melonds: backup failed: {e}"))?;
    std::fs::write(&path, content).map_err(|e| format!("melonds: write failed: {e}"))?;
    Ok(())
}

pub fn status() -> MelonStatus {
    match read_config() {
        Err(_) => MelonStatus {
            config_found: false,
            keyboard_mapped: false,
            joystick_mapped: false,
        },
        Ok(content) => MelonStatus {
            config_found: true,
            keyboard_mapped: section_key_value(&content, KEYBOARD_SECTION, "A")
                .is_some_and(|v| v != -1),
            joystick_mapped: section_key_value(&content, JOYSTICK_SECTION, "A")
                .is_some_and(|v| v != -1),
        },
    }
}

pub fn apply_keyboard() -> Result<String, String> {
    let content = read_config()?;
    let (patched, n) = patch_section(&content, KEYBOARD_SECTION, KEYBOARD_MAP);
    if n == 0 {
        return Err("melonds: keyboard section not found in config".into());
    }
    write_config(&patched)?;
    Ok(format!("{n} keyboard keys mapped"))
}

pub fn apply_dualsense() -> Result<String, String> {
    let content = read_config()?;
    let (patched, n) = patch_section(&content, JOYSTICK_SECTION, DUALSENSE_MAP);
    if n == 0 {
        return Err("melonds: joystick section not found in config".into());
    }
    write_config(&patched)?;
    Ok(format!("{n} controller buttons mapped"))
}
