// GBA header parsing — docs/architecture.md §4.1.
// Internal title @ 0xA0 (12 B ASCII), game code @ 0xAC (4 B ASCII).
// Minimum file size 0xB0 (176) bytes. icon_png_base64 is always None for GBA.
// STUB: compiling placeholder. Backend implementer replaces the body.

use std::path::Path;

use super::Game;

/// Parses a .gba file header into a `Game`. Returns None if the file is
/// smaller than 0xB0 bytes or unreadable.
/// STUB: always returns None.
pub fn parse_gba(_path: &Path) -> Option<Game> {
    None
}
