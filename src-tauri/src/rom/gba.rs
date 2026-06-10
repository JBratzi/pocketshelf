// GBA header parsing — docs/architecture.md §4.1.
// Internal title @ 0xA0 (12 B ASCII), game code @ 0xAC (4 B ASCII).
// Minimum file size 0xB0 (176) bytes. icon_png_base64 is always None for GBA.

use std::fs::File;
use std::io::Read;
use std::path::Path;

use super::{decode_ascii, file_name, file_stem, make_id, modified_ms, Game};

/// Minimum valid file size: the header runs through offset 0xAF.
const MIN_SIZE: u64 = 0xB0;

/// Parses a .gba file header into a `Game`. Returns None if the file is
/// smaller than 0xB0 bytes or unreadable. Never panics.
pub fn parse_gba(path: &Path) -> Option<Game> {
    let mut file = File::open(path).ok()?;
    let meta = file.metadata().ok()?;
    if meta.len() < MIN_SIZE {
        return None;
    }

    let mut header = [0u8; MIN_SIZE as usize];
    file.read_exact(&mut header).ok()?;

    let title = decode_ascii(&header[0xA0..0xAC]);
    let game_code = decode_ascii(&header[0xAC..0xB0]);
    let internal_title = if title.is_empty() {
        file_stem(path)
    } else {
        title
    };

    let path_str = path.to_string_lossy().into_owned();
    Some(Game {
        id: make_id(&path_str),
        file_name: file_name(path),
        path: path_str,
        platform: "gba".to_string(),
        internal_title,
        game_code,
        size_bytes: meta.len(),
        icon_png_base64: None,
        modified_at: modified_ms(&meta),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn temp_rom(name: &str, bytes: &[u8]) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "pocketshelf-gba-{}-{}",
            std::process::id(),
            name
        ));
        fs::write(&path, bytes).unwrap();
        path
    }

    #[test]
    fn parses_synthetic_header() {
        // Fake 0x200-byte GBA ROM: NUL-padded title + game code.
        let mut rom = vec![0u8; 0x200];
        rom[0xA0..0xA8].copy_from_slice(b"TESTGAME"); // 12-byte field, NUL-padded
        rom[0xAC..0xB0].copy_from_slice(b"AXYZ");
        let path = temp_rom("ok.gba", &rom);

        let game = parse_gba(&path).expect("valid header must parse");
        assert_eq!(game.internal_title, "TESTGAME");
        assert_eq!(game.game_code, "AXYZ");
        assert_eq!(game.platform, "gba");
        assert_eq!(game.size_bytes, 0x200);
        assert!(game.icon_png_base64.is_none());
        assert_eq!(game.id.len(), 16);
        assert!(game.modified_at > 0);

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn truncated_file_is_skipped() {
        // Below the 0xB0 minimum — must return None, not panic.
        let path = temp_rom("tiny.gba", &vec![0u8; 0xAF]);
        assert!(parse_gba(&path).is_none());
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn empty_title_falls_back_to_file_stem() {
        // All-NUL title (and a non-printable byte) => fall back to file stem.
        let mut rom = vec![0u8; 0x200];
        rom[0xA0] = 0x01; // non-printable, dropped by decode_ascii
        let path = temp_rom("fallback.gba", &rom);

        let game = parse_gba(&path).expect("must parse");
        assert_eq!(
            game.internal_title,
            path.file_stem().unwrap().to_string_lossy()
        );
        assert_eq!(game.game_code, "");

        let _ = fs::remove_file(&path);
    }
}
