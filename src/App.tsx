// PocketShelf — app shell: Sidebar + TopBar + Shelf grid + slide-in
// DetailPanel + Settings modal (architecture.md §7, design-system.md).

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "motion/react";
import type { Game } from "./types";
import { useLibrary } from "./store";
import { useToast } from "./components/Toast";
import * as ipc from "./dev/safeIpc";
import { Sidebar, type PlatformFilter } from "./components/Sidebar";
import { TopBar, type SortKey } from "./components/TopBar";
import { Shelf } from "./components/Shelf";
import { DetailPanel } from "./components/DetailPanel";
import { EmptyState } from "./components/EmptyState";
import { SettingsModal } from "./components/SettingsModal";
import { DropOverlay } from "./components/DropOverlay";
import { useGlobalShortcuts } from "./useGlobalShortcuts";

function App() {
  const { state, rescan, updateSettings, addPaths, play } = useLibrary();
  const { toast } = useToast();

  // Derived UI state stays in component state (architecture.md §6).
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [sort, setSort] = useState<SortKey>("title");
  const [selected, setSelected] = useState<Game | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Native drag & drop of ROM files/folders onto the window (Tauri only —
  // in a plain dev browser there is no webview event source, so we no-op).
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      const stop = await getCurrentWebview().onDragDropEvent((event) => {
        const t = event.payload.type;
        if (t === "enter" || t === "over") {
          setDragging(true);
        } else if (t === "drop") {
          setDragging(false);
          void addPaths(event.payload.paths);
        } else {
          setDragging(false);
        }
      });
      if (cancelled) stop();
      else unlisten = stop;
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [addPaths]);

  const scanning = state.status === "scanning";

  const visibleGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = state.games;
    if (filter !== "all") list = list.filter((g) => g.platform === filter);
    if (q) {
      list = list.filter(
        (g) =>
          g.internal_title.toLowerCase().includes(q) ||
          g.file_name.toLowerCase().includes(q) ||
          g.game_code.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "title":
        sorted.sort((a, b) =>
          a.internal_title.localeCompare(b.internal_title, undefined, {
            sensitivity: "base",
          }),
        );
        break;
      case "recent":
        sorted.sort((a, b) => b.modified_at - a.modified_at);
        break;
      case "size":
        sorted.sort((a, b) => b.size_bytes - a.size_bytes);
        break;
    }
    return sorted;
  }, [state.games, query, filter, sort]);

  const openDetail = useCallback((game: Game) => {
    setSelected(game);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => setDetailOpen(false), []);

  const handleRescan = useCallback(() => {
    if (
      state.settings.rom_folders.length === 0 &&
      state.settings.rom_files.length === 0
    ) {
      toast("warning", "No ROM sources configured yet — add a folder or drop files here.");
      setSettingsOpen(true);
      return;
    }
    void rescan();
  }, [
    rescan,
    state.settings.rom_folders.length,
    state.settings.rom_files.length,
    toast,
  ]);

  // Empty-state CTA: pick a folder, persist it, scan right away.
  const addFirstFolder = useCallback(async () => {
    try {
      const path = await ipc.pickFolder();
      if (!path) return;
      if (!state.settings.rom_folders.includes(path)) {
        await updateSettings({
          ...state.settings,
          rom_folders: [...state.settings.rom_folders, path],
        });
      }
    } catch (err) {
      toast("error", String(err));
    }
  }, [state.settings, updateSettings, toast]);

  useGlobalShortcuts({
    onFocusSearch: () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    onRescan: handleRescan,
    onOpenSettings: () => setSettingsOpen(true),
    onEscape: () => {
      if (settingsOpen) return; // modal handles its own Esc (capture phase)
      if (document.activeElement === searchRef.current && query) {
        setQuery("");
      } else if (document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      } else if (detailOpen) {
        closeDetail();
      }
    },
  });

  const selectedEmulator = selected
    ? selected.platform === "gba"
      ? state.settings.emulator_gba
      : state.settings.emulator_nds
    : "";

  const hasFolders = state.settings.rom_folders.length > 0;
  const hasGames = state.games.length > 0;

  let content: ReactNode;
  if (visibleGames.length > 0) {
    content = (
      <Shelf
        games={visibleGames}
        entranceKey={filter}
        selectedId={selected?.id ?? null}
        onSelect={(g) => setSelected(g)}
        onOpenDetail={openDetail}
        onPlay={play}
      />
    );
  } else if (hasGames) {
    content = (
      <EmptyState
        variant="no-results"
        query={query}
        onAddFolder={addFirstFolder}
        onClearSearch={() => setQuery("")}
      />
    );
  } else if (state.status === "booting" || scanning) {
    content = (
      <div className="flex h-full items-center justify-center">
        <p className="font-body text-[14px] font-medium text-silver-500">
          {scanning ? "Scanning your shelf…" : "Loading…"}
        </p>
      </div>
    );
  } else {
    content = (
      <EmptyState
        variant={hasFolders ? "no-games" : "no-folders"}
        onAddFolder={addFirstFolder}
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-bg-base text-silver-300">
      <Sidebar
        games={state.games}
        filter={filter}
        onFilter={(f) => {
          setFilter(f);
          setSelected(null);
          setDetailOpen(false);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          ref={searchRef}
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
          scanning={scanning}
          onRescan={handleRescan}
        />

        <div className="flex min-h-0 flex-1">
          <main className="ps-texture min-w-0 flex-1 overflow-y-auto">{content}</main>

          <AnimatePresence>
            {detailOpen && selected && (
              <DetailPanel
                key={selected.id}
                game={selected}
                emulatorApp={selectedEmulator}
                onPlay={play}
                onClose={closeDetail}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            settings={state.settings}
            onSave={updateSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{dragging && <DropOverlay />}</AnimatePresence>
    </div>
  );
}

export default App;
