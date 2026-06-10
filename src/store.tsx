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
  /** Rescans the library (current rom_folders unless overridden). */
  rescan: (foldersOverride?: string[], opts?: { silent?: boolean }) => Promise<void>;
  /** Persists settings via the backend, then rescans if folders changed. */
  updateSettings: (settings: Settings) => Promise<void>;
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
  const scanningRef = useRef(false);

  const rescan = useCallback(
    async (foldersOverride?: string[], opts?: { silent?: boolean }) => {
      if (scanningRef.current) return;
      const folders = foldersOverride ?? settingsRef.current.rom_folders;
      scanningRef.current = true;
      dispatch({ type: "SCAN_START" });
      try {
        const games = await ipc.scanLibrary(folders);
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
        const message = String(err);
        dispatch({ type: "SCAN_ERROR", message });
        toast("error", message);
      } finally {
        scanningRef.current = false;
      }
    },
    [toast],
  );

  const updateSettings = useCallback(
    async (settings: Settings) => {
      const prevFolders = settingsRef.current.rom_folders;
      dispatch({ type: "SET_SETTINGS", settings });
      try {
        await ipc.saveSettings(settings);
      } catch (err) {
        toast("error", String(err));
        return;
      }
      const changed =
        prevFolders.length !== settings.rom_folders.length ||
        prevFolders.some((f, i) => f !== settings.rom_folders[i]);
      if (changed) void rescan(settings.rom_folders);
    },
    [rescan, toast],
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
        await ipc.launchGame(game.path, emulatorApp);
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
      dispatch({
        type: "HYDRATE",
        games: cached?.games ?? [],
        settings,
        lastScanAt: cached?.lastScanAt ?? null,
      });
      if (settings.rom_folders.length > 0) {
        void rescan(settings.rom_folders, { silent: cached !== null });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ state, rescan, updateSettings, play, clearError }),
    [state, rescan, updateSettings, play, clearError],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
