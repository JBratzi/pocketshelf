# PocketShelf

A macOS-native library manager for your own handheld cartridge dumps (`.gba` / `.nds` files). PocketShelf catalogs ROM files you already have on disk, reads their headers for titles and icons, and launches them in the emulator you choose.

**Stack:** Tauri 2 (Rust) · React 18 · TypeScript · Vite · Tailwind CSS v4 · motion

## Legal disclaimer

PocketShelf is an independent, unofficial file-management tool. It is not affiliated with, endorsed by, or sponsored by Nintendo or any game publisher.

- PocketShelf **does not download, link to, or distribute ROMs or any copyrighted game content** — it only catalogs files already present on your computer.
- It is intended **solely for managing backup dumps of cartridges you personally own**, where such backups are permitted by the laws of your jurisdiction.
- Platform terms such as "GBA" and "NDS" appear in the app strictly as factual file-format descriptors. All trademarks are the property of their respective owners.
- You are responsible for ensuring your use of this software complies with applicable copyright law.

## Development

Prerequisites: Node.js, Rust (this machine: via mise shims — `export PATH="$HOME/.local/share/mise/shims:$PATH"` before cargo commands), Xcode CLT.

```bash
npm install
npm run tauri dev        # run the app
npm run build            # typecheck + bundle frontend
(cd src-tauri && cargo check)  # check backend
```

## Architecture

The IPC contract, ROM-parsing spec, and file layout are frozen in [`docs/architecture.md`](docs/architecture.md). Visual language lives in [`docs/design-system.md`](docs/design-system.md). Frontend calls the backend only through `src/ipc.ts`; shared types live in `src/types.ts`.
