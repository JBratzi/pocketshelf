// Sidebar — design-system.md §4.2 + §7 (traffic-light drag zone, faux vibrancy).

import type { ReactNode } from "react";
import { Gamepad2, Settings } from "lucide-react";
import type { Game, Platform } from "../types";
import { cx } from "../utils";

export type PlatformFilter = "all" | Platform;

interface SidebarProps {
  games: Game[];
  filter: PlatformFilter;
  onFilter: (f: PlatformFilter) => void;
  onOpenSettings: () => void;
}

const PLATFORM_DOT: Record<Platform, string> = {
  gba: "#8B7BF4",
  nds: "#5FB7D4",
};

function CountPill({ n }: { n: number }) {
  return (
    <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[10px] leading-[14px] text-silver-500">
      {n}
    </span>
  );
}

interface ItemProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Item({ active, onClick, children }: ItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left font-body text-[14px] leading-5 font-medium transition-colors",
        active
          ? "bg-[rgba(108,92,231,0.18)] text-primary-300"
          : "text-silver-300 hover:bg-white/5",
      )}
    >
      {active && (
        <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary-500" />
      )}
      {children}
    </button>
  );
}

function GroupHeader({ children }: { children: string }) {
  return (
    <p className="px-3 pt-4 pb-1.5 font-body text-xs leading-4 font-medium tracking-[0.08em] text-silver-700 uppercase">
      {children}
    </p>
  );
}

export function Sidebar({ games, filter, onFilter, onOpenSettings }: SidebarProps) {
  const gbaCount = games.filter((g) => g.platform === "gba").length;
  const ndsCount = games.filter((g) => g.platform === "nds").length;

  return (
    <aside className="ps-sidebar flex w-[220px] shrink-0 flex-col select-none">
      {/* Traffic-light zone — empty drag region (design-system §7.1). */}
      <div data-tauri-drag-region className="h-[52px] shrink-0" />

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-3">
        <GroupHeader>Library</GroupHeader>
        <Item active={filter === "all"} onClick={() => onFilter("all")}>
          <Gamepad2 size={20} strokeWidth={2} className="shrink-0" />
          <span>All Games</span>
          <CountPill n={games.length} />
        </Item>

        <GroupHeader>Platforms</GroupHeader>
        {/* Factual platform descriptors only — never stylized branding. */}
        <Item active={filter === "gba"} onClick={() => onFilter("gba")}>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: PLATFORM_DOT.gba }}
          />
          <span>GBA</span>
          <CountPill n={gbaCount} />
        </Item>
        <Item active={filter === "nds"} onClick={() => onFilter("nds")}>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: PLATFORM_DOT.nds }}
          />
          <span>NDS</span>
          <CountPill n={ndsCount} />
        </Item>

        <div className="flex-1" />

        <Item active={false} onClick={onOpenSettings}>
          <Settings size={20} strokeWidth={2} className="shrink-0" />
          <span>Settings</span>
          <span className="ml-auto font-mono text-[10px] text-silver-700">⌘,</span>
        </Item>
      </nav>
    </aside>
  );
}
