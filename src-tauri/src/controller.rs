// Game controller presence detection via macOS `hidutil list`.
// A device is a gamepad iff HID UsagePage == 1 (Generic Desktop) and
// Usage == 5 (Game Pad) — name matching alone is unsafe (e.g. Apple's
// internal "ANS3CGv2Controller" NAND sensor would false-positive).

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ControllerStatus {
    pub connected: bool,
    /// Friendly name when recognizable ("DualSense Wireless Controller"…).
    pub name: Option<String>,
}

const KNOWN_NAMES: &[&str] = &[
    "DualSense",
    "DUALSHOCK",
    "Wireless Controller",
    "Xbox",
    "Pro Controller",
    "Joy-Con",
    "Gamepad",
];

pub fn status() -> ControllerStatus {
    let Ok(out) = std::process::Command::new("hidutil").arg("list").output() else {
        return ControllerStatus { connected: false, name: None };
    };
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        let cols: Vec<&str> = line.split_whitespace().collect();
        // VendorID ProductID LocationID UsagePage Usage … (decimal values)
        if cols.len() > 4 && cols[3] == "1" && cols[4] == "5" {
            let name = KNOWN_NAMES
                .iter()
                .find(|n| line.contains(*n))
                .map(|n| {
                    if *n == "DualSense" || *n == "Wireless Controller" {
                        "DualSense".to_string()
                    } else {
                        n.to_string()
                    }
                })
                .or(Some("Controller".to_string()));
            return ControllerStatus { connected: true, name };
        }
    }
    ControllerStatus { connected: false, name: None }
}
