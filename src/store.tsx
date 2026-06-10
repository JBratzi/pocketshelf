// PocketShelf frontend state — architecture.md §6.
// Plain React Context + useReducer. localStorage cache for instant boot,
// then a background rescan. Settings SSOT is the backend (get/save_settings).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { Game, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import * as ipc from "./dev/safeIpc";
import { useToast } from "./components/Toast";

const CACHE_KEY = "pocketshelf.library.v1";

export interface AppState {
  games: Game[];
  settings: Settings;
  status: "booting" | "idle" | "scanning" | "error";
  error: string | null;
  lastScanAt: number | null;
}

type Action =
  | { type: "HYDRATE"; games: Game[]; settings: Settings; lastScanAt: number | null }
  | { type: "SCAN_START" }
  | { type: "SCAN_SUCCESS"; games: Game[]; at: number }
  | { type: "SCAN_ERROR"; message: string }
  | { type: "SET_SETTINGS"; settings: Settings }
  | { type: "CLEAR_ERROR" };

const initialState: AppState = {
  games: [],
  settings: DEFAULT_SETTINGS,
  status: "booting",
  error: null,
  lastScanAt: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        games: action.games,
        settings: action.settings,
        lastScanAt: action.lastScanAt,
        status: "idle",
      };
    case "SCAN_START":
      return { ...state, status: "scanning", error: null };
    case "SCAN_SUCCESS":
      return { ...state, games: action.games, status: "idle", lastScanAt: action.at };
    case "SCAN_ERROR":
      return { ...state, status: "error", error: action.message };
    case "SET_SETTINGS":
      return { ...state, settings: action.settings };
    case "CLEAR_ERROR":
      return { ...state, error: null };
  }
}

function readCache(): { games: Game[]; lastScanAt: number | null } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { games?: unknown; lastScanAt?: unknown };
    if (!Array.isArray(parsed.games)) throw new Error("corrupt cache");
    return {
      games: parsed.games as Game[],
      lastScanAt: typeof parsed.lastScanAt === "number" ? parsed.lastScanAt : null,
    };
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeCache(games: Game[], lastScanAt: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ games, lastScanAt }));
  } catch {
    // Quota/private-mode failures are non-fatal — cache is an optimization.
  }
}

interface LibraryContextValue {
  state: AppState;
  /** Rescans the library (current rom_folders/rom_files unless overridden). */
  rescan: (
    override?: { folders?: string[]; files?: string[] },
    opts?: { silent?: boolean },
  ) => Promise<void>;
  /** Persists settings via the backend, then rescans if sources changed. */
  updateSettings: (settings: Settings) => Promise<void>;
  /** Adds dropped paths (folders and/or .gba/.nds files), persists, rescans. */
  addPaths: (paths: string[]) => Promise<void>;
  /** Launches a game with the platform's configured emulator. */
  play: (game: Game) => Promise<void>;
  clearError: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within <LibraryProvider>");
  return ctx;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();
  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;
  // Generation token: every rescan bumps it; only the latest generation may
  // apply results / write the cache. Concurrent requests are never dropped —
  // a newer call (e.g. folders changed mid-scan) simply supersedes older ones.
  const scanGenRef = useRef(0);

  const rescan = useCallback(
    async (
      override?: { folders?: string[]; files?: string[] },
      opts?: { silent?: boolean },
    ) => {
      const gen = ++scanGenRef.current;
      const folders = override?.folders ?? settingsRef.current.rom_folders;
      const files = override?.files ?? settingsRef.current.rom_files;
      dispatch({ type: "SCAN_START" });
      try {
        const games = await ipc.scanPaths(folders, files);
        if (gen !== scanGenRef.current) return; // superseded by a newer rescan
        const at = Date.now();
        dispatch({ type: "SCAN_SUCCESS", games, at });
        writeCache(games, at);
        if (!opts?.silent) {
          toast(
            "success",
            `Scan complete — ${games.length} ${games.length === 1 ? "game" : "games"} found`,
          );
        }
      } catch (err) {
        if (gen !== scanGenRef.current) return; // stale failure — ignore
        const message = String(err);
        dispatch({ type: "SCAN_ERROR", message });
        toast("error", message);
      }
    },
    [toast],
  );

  const updateSettings = useCallback(
    async (settings: Settings) => {
      const prevSettings = settingsRef.current;
      dispatch({ type: "SET_SETTINGS", settings });
      try {
        await ipc.saveSettings(settings);
      } catch (err) {
        // Roll back the optimistic update so in-memory settings never
        // diverge from what is actually persisted on disk, then rethrow
        // so callers (e.g. SettingsModal) know the save failed.
        dispatch({ type: "SET_SETTINGS", settings: prevSettings });
        toast("error", String(err));
        throw err;
      }
      const changed =
        prevSettings.rom_folders.length !== settings.rom_folders.length ||
        prevSettings.rom_folders.some((f, i) => f !== settings.rom_folders[i]) ||
        prevSettings.rom_files.length !== settings.rom_files.length ||
        prevSettings.rom_files.some((f, i) => f !== settings.rom_files[i]);
      if (changed) {
        void rescan({ folders: settings.rom_folders, files: settings.rom_files });
      }
    },
    [rescan, toast],
  );

  const addPaths = useCallback(
    async (paths: string[]) => {
      const s = settingsRef.current;
      const isRom = (p: string) => /\.(gba|nds)$/i.test(p);
      const newFiles = paths.filter((p) => isRom(p) && !s.rom_files.includes(p));
      const newFolders = paths.filter((p) => !isRom(p) && !s.rom_folders.includes(p));
      if (newFiles.length === 0 && newFolders.length === 0) {
        toast("info", "Already on your shelf — rescanning…");
        void rescan();
        return;
      }
      const added = newFiles.length + newFolders.length;
      toast("success", `Added ${added} ${added === 1 ? "item" : "items"} — scanning…`);
      await updateSettings({
        ...s,
        rom_folders: [...s.rom_folders, ...newFolders],
        rom_files: [...s.rom_files, ...newFiles],
      });
    },
    [rescan, toast, updateSettings],
  );

  const play = useCallback(
    async (game: Game) => {
      const s = settingsRef.current;
      const emulatorApp = game.platform === "gba" ? s.emulator_gba : s.emulator_nds;
      if (!emulatorApp.trim()) {
        toast("warning", "No emulator configured for this platform — set one in Settings.");
        return;
      }
      toast("info", `Launching ${game.internal_title}…`);
      try {
        await ipc.launchGame(game.path, emulatorApp, game.id);
      } catch (err) {
        toast("error", String(err));
      }
    },
    [toast],
  );

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  // Boot: hydrate from cache synchronously-ish, load settings, then
  // background-rescan so the shelf is instant but never stale.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = readCache();
      let settings: Settings = DEFAULT_SETTINGS;
      try {
        settings = await ipc.getSettings();
      } catch (err) {
        if (!cancelled) toast("error", String(err));
      }
      if (cancelled) return;
      // No sources configured → the cache (possibly from a previous source
      // set) is meaningless: drop it so ghost games never survive a boot.
      const hasSources =
        settings.rom_folders.length > 0 || settings.rom_files.length > 0;
      const usableCache = hasSources ? cached : null;
      if (!hasSources && cached !== null) {
        try {
          localStorage.removeItem(CACHE_KEY);
        } catch {
          // Non-fatal — cache is an optimization.
        }
      }
      dispatch({
        type: "HYDRATE",
        games: usableCache?.games ?? [],
        settings,
        lastScanAt: usableCache?.lastScanAt ?? null,
      });
      if (hasSources) {
        void rescan(
          { folders: settings.rom_folders, files: settings.rom_files },
          { silent: usableCache !== null },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ state, rescan, updateSettings, addPaths, play, clearError }),
    [state, rescan, updateSettings, addPaths, play, clearError],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
