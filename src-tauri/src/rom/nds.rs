// NDS header + banner parsing — docs/architecture.md §4.2.
// Header: title @ 0x00 (12 B ASCII), game code @ 0x0C (4 B), banner offset @ 0x68 (u32 LE).
// Banner: icon bitmap @ +0x20 (512 B, 4bpp tiled), palette @ +0x220 (16 × u16 LE BGR555),
// titles @ +0x240 / +0x340 (UTF-16LE). Palette index 0 = fully transparent.
// Minimum file size 0x160 (352) bytes. Icon failures => icon_png_base64 = None, never error.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;

use super::{decode_ascii, file_name, file_stem, make_id, modified_ms, Game};

/// Minimum valid file size: the header runs through offset 0x15F.
const MIN_SIZE: u64 = 0x160;
/// Bytes of banner data we need: through the EN title slot (+0x340 + 0x100).
const BANNER_LEN: u64 = 0x440;

/// Parses a .nds file header (+ banner icon as base64 PNG) into a `Game`.
/// Returns None if the file is smaller than 0x160 bytes or unreadable.
/// Banner/icon failures degrade gracefully (icon = None, header title used).
pub fn parse_nds(path: &Path) -> Option<Game> {
    let mut file = File::open(path).ok()?;
    let meta = file.metadata().ok()?;
    let file_size = meta.len();
    if file_size < MIN_SIZE {
        return None;
    }

    let mut header = [0u8; MIN_SIZE as usize];
    file.read_exact(&mut header).ok()?;

    let header_title = decode_ascii(&header[0x00..0x0C]);
    let game_code = decode_ascii(&header[0x0C..0x10]);
    let banner_offset = u32::from_le_bytes([header[0x68], header[0x69], header[0x6A], header[0x6B]]) as u64;

    // Banner: only usable when the offset is non-zero and the full 0x440-byte
    // region fits inside the file. Any failure => no icon, no banner title.
    let mut banner_title: Option<String> = None;
    let mut icon_png_base64: Option<String> = None;
    if banner_offset != 0 && banner_offset.checked_add(BANNER_LEN).is_some_and(|end| end <= file_size) {
        let mut banner = vec![0u8; BANNER_LEN as usize];
        if file.seek(SeekFrom::Start(banner_offset)).is_ok() && file.read_exact(&mut banner).is_ok() {
            // Title precedence: EN slot (+0x340) > JA slot (+0x240).
            banner_title = decode_banner_title(&banner[0x340..0x440])
                .or_else(|| decode_banner_title(&banner[0x240..0x340]));
            icon_png_base64 = decode_icon(&banner[0x20..0x220], &banner[0x220..0x240]);
        }
    }

    // internal_title precedence: banner (EN > JA) > header ASCII > file stem.
    let internal_title = banner_title
        .or(if header_title.is_empty() { None } else { Some(header_title) })
        .unwrap_or_else(|| file_stem(path));

    let path_str = path.to_string_lossy().into_owned();
    Some(Game {
        id: make_id(&path_str),
        file_name: file_name(path),
        path: path_str,
        platform: "nds".to_string(),
        internal_title,
        game_code,
        size_bytes: file_size,
        icon_png_base64,
        modified_at: modified_ms(&meta),
    })
}

/// Decodes a 256-byte UTF-16LE banner title slot: truncate at the first
/// 0x0000 code unit, lossy decode, keep only the first line, trim.
/// Returns None when the result is empty.
fn decode_banner_title(bytes: &[u8]) -> Option<String> {
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .take_while(|&u| u != 0)
        .collect();
    let full = String::from_utf16_lossy(&units);
    let first_line = full.split('\n').next().unwrap_or("").trim().to_string();
    if first_line.is_empty() {
        None
    } else {
        Some(first_line)
    }
}

/// Decodes the 512-byte 4bpp tiled icon bitmap + 32-byte BGR555 palette into
/// a 32×32 RGBA PNG, base64-encoded (no data-URI prefix). None on any failure.
fn decode_icon(bitmap: &[u8], palette_bytes: &[u8]) -> Option<String> {
    if bitmap.len() != 512 || palette_bytes.len() != 32 {
        return None;
    }

    // 16-entry RGBA palette from BGR555: r = bits 0-4, g = 5-9, b = 10-14.
    // 5→8-bit expansion: (c << 3) | (c >> 2). Index 0 is fully transparent.
    let mut palette = [[0u8; 4]; 16];
    for (i, entry) in palette.iter_mut().enumerate() {
        let v = u16::from_le_bytes([palette_bytes[2 * i], palette_bytes[2 * i + 1]]);
        let expand = |c5: u16| -> u8 { (((c5 << 3) | (c5 >> 2)) & 0xFF) as u8 };
        *entry = [
            expand(v & 0x1F),
            expand((v >> 5) & 0x1F),
            expand((v >> 10) & 0x1F),
            255,
        ];
    }
    palette[0] = [0, 0, 0, 0];

    // 4×4 grid of 8×8 tiles, row-major; 32 bytes/tile; two pixels per byte
    // (low nibble = first/left pixel, high nibble = second/right pixel).
    let mut rgba = vec![0u8; 32 * 32 * 4];
    for y in 0..32usize {
        for x in 0..32usize {
            let tile = (y / 8) * 4 + (x / 8);
            let in_tile = (y % 8) * 8 + (x % 8);
            let byte = bitmap[tile * 32 + in_tile / 2];
            let index = if in_tile % 2 == 0 { byte & 0x0F } else { byte >> 4 } as usize;
            let off = (y * 32 + x) * 4;
            rgba[off..off + 4].copy_from_slice(&palette[index]);
        }
    }

    // RGBA buffer -> PNG -> base64 (STANDARD engine, padded).
    let mut png_bytes: Vec<u8> = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_bytes, 32, 32);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().ok()?;
        writer.write_image_data(&rgba).ok()?;
        writer.finish().ok()?;
    }
    Some(STANDARD.encode(&png_bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn temp_rom(name: &str, bytes: &[u8]) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "pocketshelf-nds-{}-{}",
            std::process::id(),
            name
        ));
        fs::write(&path, bytes).unwrap();
        path
    }

    /// Builds a synthetic NDS ROM: 0x160 header, banner at 0x200.
    /// EN banner title "DEMO CART\nLINE2", palette[1] = pure red, bitmap all
    /// index 1 except the very first pixel which is index 0 (transparent).
    fn synthetic_nds_with_banner() -> Vec<u8> {
        let banner_offset = 0x200u32;
        let mut rom = vec![0u8; (banner_offset as usize) + 0x440];
        rom[0x00..0x08].copy_from_slice(b"HDRTITLE");
        rom[0x0C..0x10].copy_from_slice(b"TST1");
        rom[0x68..0x6C].copy_from_slice(&banner_offset.to_le_bytes());

        let b = banner_offset as usize;
        // Bitmap: every byte 0x11 (both nibbles = palette index 1)...
        for byte in rom[b + 0x20..b + 0x220].iter_mut() {
            *byte = 0x11;
        }
        // ...except pixel (0,0): tile 0, in_tile 0, low nibble => index 0.
        rom[b + 0x20] = 0x10; // low nibble 0 (transparent), high nibble 1
        // Palette entry 1 = BGR555 pure red (r5 = 31) = 0x001F LE.
        rom[b + 0x220 + 2] = 0x1F;
        rom[b + 0x220 + 3] = 0x00;
        // JA title slot (+0x240): "JA TITLE".
        for (i, u) in "JA TITLE".encode_utf16().enumerate() {
            rom[b + 0x240 + 2 * i..b + 0x240 + 2 * i + 2].copy_from_slice(&u.to_le_bytes());
        }
        // EN title slot (+0x340): "DEMO CART\nLINE2".
        for (i, u) in "DEMO CART\nLINE2".encode_utf16().enumerate() {
            rom[b + 0x340 + 2 * i..b + 0x340 + 2 * i + 2].copy_from_slice(&u.to_le_bytes());
        }
        rom
    }

    #[test]
    fn banner_icon_and_en_title_decode() {
        let rom = synthetic_nds_with_banner();
        let path = temp_rom("banner.nds", &rom);

        let game = parse_nds(&path).expect("must parse");
        assert_eq!(game.platform, "nds");
        assert_eq!(game.game_code, "TST1");
        // EN slot wins, first line only.
        assert_eq!(game.internal_title, "DEMO CART");

        // Decode the PNG back and verify pixels.
        let b64 = game.icon_png_base64.expect("icon must decode");
        let png_bytes = STANDARD.decode(b64).expect("valid base64");
        let decoder = png::Decoder::new(std::io::Cursor::new(png_bytes));
        let mut reader = decoder.read_info().expect("valid png");
        let mut buf = vec![0u8; reader.output_buffer_size().unwrap()];
        let info = reader.next_frame(&mut buf).expect("frame");
        assert_eq!(info.width, 32);
        assert_eq!(info.height, 32);
        assert_eq!(info.color_type, png::ColorType::Rgba);
        // Pixel (0,0): palette index 0 => fully transparent.
        assert_eq!(&buf[0..4], &[0, 0, 0, 0]);
        // Pixel (1,0): palette index 1 => opaque red (5-bit 31 -> 255).
        assert_eq!(&buf[4..8], &[255, 0, 0, 255]);

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn banner_offset_zero_means_no_icon_header_title_used() {
        let mut rom = vec![0u8; 0x200];
        rom[0x00..0x08].copy_from_slice(b"HDRTITLE");
        rom[0x0C..0x10].copy_from_slice(b"TST2");
        // banner offset stays 0.
        let path = temp_rom("nobanner.nds", &rom);

        let game = parse_nds(&path).expect("must parse");
        assert!(game.icon_png_base64.is_none());
        assert_eq!(game.internal_title, "HDRTITLE");
        assert_eq!(game.game_code, "TST2");

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn truncated_banner_and_truncated_file_are_safe() {
        // Banner offset points past EOF => icon None, scan-safe.
        let mut rom = vec![0u8; 0x400];
        rom[0x00..0x04].copy_from_slice(b"CART");
        rom[0x68..0x6C].copy_from_slice(&0x300u32.to_le_bytes()); // 0x300 + 0x440 > 0x400
        let path = temp_rom("truncbanner.nds", &rom);
        let game = parse_nds(&path).expect("header still parses");
        assert!(game.icon_png_base64.is_none());
        assert_eq!(game.internal_title, "CART");
        let _ = fs::remove_file(&path);

        // File below the 0x160 minimum => None, no panic.
        let tiny = temp_rom("tiny.nds", &vec![0u8; 0x100]);
        assert!(parse_nds(&tiny).is_none());
        let _ = fs::remove_file(&tiny);
    }
}
