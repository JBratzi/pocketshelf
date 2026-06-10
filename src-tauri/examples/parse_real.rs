// Dev sanity check: parse real ROMs from ~/ROMs and dump extracted NDS icons.
// Run: cargo run --example parse_real [folder]

use base64::Engine;

fn main() {
    let folder = std::env::args()
        .nth(1)
        .unwrap_or_else(|| format!("{}/ROMs", std::env::var("HOME").unwrap()));
    let games = pocketshelf_lib::rom::scan(&[folder.clone()]);
    println!("scanned {} -> {} game(s)", folder, games.len());
    for g in &games {
        println!(
            "- [{}] title={:?} code={:?} size={}B icon={}",
            g.platform,
            g.internal_title,
            g.game_code,
            g.size_bytes,
            g.icon_png_base64.as_ref().map_or(0, |s| s.len())
        );
        if let Some(b64) = &g.icon_png_base64 {
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(b64)
                .expect("icon base64 must decode");
            let out = format!("/tmp/pocketshelf-icon-{}.png", g.game_code.trim());
            std::fs::write(&out, &bytes).unwrap();
            println!("  icon dumped: {}", out);
        }
    }
}
