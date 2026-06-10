// Dev sanity check: apply melonDS mappings to the real local config.
// Run: cargo run --example melonds_apply

fn main() {
    println!("status before: {:?}", pocketshelf_lib::melonds::status());
    match pocketshelf_lib::melonds::apply_keyboard() {
        Ok(m) => println!("keyboard: {m}"),
        Err(e) => println!("keyboard ERR: {e}"),
    }
    match pocketshelf_lib::melonds::apply_dualsense() {
        Ok(m) => println!("dualsense: {m}"),
        Err(e) => println!("dualsense ERR: {e}"),
    }
    println!("status after: {:?}", pocketshelf_lib::melonds::status());
}
