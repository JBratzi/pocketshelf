// ⚠️ DEV-ONLY MOCK DATA — never used in production builds at runtime.
// Loaded by src/dev/safeIpc.ts ONLY when running `vite dev` in a plain
// browser (no Tauri backend) so the UI is previewable.
//
// Legal note: all titles are original/generic inventions. No real commercial
// game names, no Nintendo properties, no Pokemon — ever (architecture.md §0).

import type { Game, Settings } from "../types";

// A real, tiny, valid PNG (solid indigo 8x8), base64 without data-URI prefix —
// matches the backend's icon_png_base64 shape for NDS entries.
const MOCK_ICON_INDIGO =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVQYV2NkYPj/n4GBgYERRIMAmIBxgAQAtO4F/zV6FJMAAAAASUVORK5CYII=";

const MOCK_ICON_TEAL =
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGUlEQVQYV2NkYPj/n4GBgYERRIMAmIBxgAQAtO4F/zV6FJMAAAAASUVORK5CYII=";

function g(partial: Partial<Game> & Pick<Game, "id" | "file_name" | "platform" | "internal_title">): Game {
  return {
    path: `/Users/dev/RomDumps/${partial.file_name}`,
    game_code: "",
    size_bytes: 8 * 1024 * 1024,
    icon_png_base64: null,
    modified_at: Date.now() - 86_400_000,
    ...partial,
  } as Game;
}

export const MOCK_GAMES: Game[] = [
  g({
    id: "a1b2c3d4e5f60001",
    file_name: "crystal-caverns.gba",
    platform: "gba",
    internal_title: "CRYSTAL CAVERNS",
    game_code: "ACVE",
    size_bytes: 8_388_608,
  }),
  g({
    id: "a1b2c3d4e5f60002",
    file_name: "sky-courier.nds",
    platform: "nds",
    internal_title: "Sky Courier",
    game_code: "ASKE",
    size_bytes: 67_108_864,
    icon_png_base64: MOCK_ICON_INDIGO,
  }),
  g({
    id: "a1b2c3d4e5f60003",
    file_name: "dune-racer-2.gba",
    platform: "gba",
    internal_title: "DUNE RACER 2",
    game_code: "ADRE",
    size_bytes: 16_777_216,
  }),
  g({
    id: "a1b2c3d4e5f60004",
    file_name: "tidepool-tactics.nds",
    platform: "nds",
    internal_title: "Tidepool Tactics",
    game_code: "ATTE",
    size_bytes: 134_217_728,
    icon_png_base64: MOCK_ICON_TEAL,
  }),
  g({
    id: "a1b2c3d4e5f60005",
    file_name: "lantern-keep.gba",
    platform: "gba",
    internal_title: "LANTERN KEEP",
    game_code: "ALKE",
    size_bytes: 33_554_432,
  }),
  g({
    id: "a1b2c3d4e5f60006",
    file_name: "moss-garden-deluxe.nds",
    platform: "nds",
    internal_title: "Moss Garden Deluxe",
    game_code: "AMGE",
    size_bytes: 268_435_456,
    icon_png_base64: null, // banner missing → placeholder path exercised too
  }),
  g({
    id: "a1b2c3d4e5f60007",
    file_name: "orbit-juggler.gba",
    platform: "gba",
    internal_title: "ORBIT JUGGLER",
    game_code: "AOJE",
    size_bytes: 4_194_304,
  }),
  g({
    id: "a1b2c3d4e5f60008",
    file_name: "paper-pilots.nds",
    platform: "nds",
    internal_title: "Paper Pilots",
    game_code: "APPE",
    size_bytes: 33_554_432,
    icon_png_base64: MOCK_ICON_INDIGO,
  }),
];

export const MOCK_SETTINGS: Settings = {
  rom_folders: ["/Users/dev/RomDumps"],
  rom_files: [],
  emulator_gba: "OpenEmu",
  emulator_nds: "melonDS",
};
