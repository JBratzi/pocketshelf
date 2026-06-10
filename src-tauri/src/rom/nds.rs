// NDS header + banner parsing — docs/architecture.md §4.2.
// Header: title @ 0x00 (12 B ASCII), game code @ 0x0C (4 B), banner offset @ 0x68 (u32 LE).
// Banner: icon bitmap @ +0x20 (512 B, 4bpp tiled), palette @ +0x220 (16 × u16 LE BGR555),
// titles @ +0x240 / +0x340 (UTF-16LE). Palette index 0 = fully transparent.
// Minimum file size 0x160 (352) bytes. Icon failures => icon_png_base64 = None, never error.
// STUB: compiling placeholder. Backend implementer replaces the body.

use std::path::Path;

use super::Game;

/// Parses a .nds file header (+ banner icon as base64 PNG) into a `Game`.
/// Returns None if the file is smaller than 0x160 bytes or unreadable.
/// STUB: always returns None.
pub fn parse_nds(_path: &Path) -> Option<Game> {
    None
}
