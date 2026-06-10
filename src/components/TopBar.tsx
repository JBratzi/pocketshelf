// TopBar — design-system.md §4.3. Acts as a drag region for the
// hidden-title macOS window; interactive children are excluded automatically.

import { forwardRef } from "react";
import { motion } from "motion/react";
import { ArrowUpDown, RefreshCw, Search } from "lucide-react";
import { cx } from "../utils";

export type SortKey = "title" | "recent" | "size";

interface TopBarProps {
  query: string;
  onQuery: (q: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  scanning: boolean;
  onRescan: () => void;
}

const SORT_LABEL: Record<SortKey, string> = {
  title: "Title",
  recent: "Recently added",
  size: "Size",
};

const SORT_ORDER: SortKey[] = ["title", "recent", "size"];

export const TopBar = forwardRef<HTMLInputElement, TopBarProps>(function TopBar(
  { query, onQuery, sort, onSort, scanning, onRescan },
  searchRef,
) {
  return (
    <header
      data-tauri-drag-region
      className="relative flex h-[52px] shrink-0 items-center gap-3 border-b border-border-default bg-bg-surface px-4 select-none"
    >
      {/* Search */}
      <div className="relative w-full max-w-[360px]">
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-silver-500"
        />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your library… (⌘F)"
          spellCheck={false}
          className={cx(
            "h-8 w-full rounded-full border border-border-strong bg-bg-raised pr-4 pl-9",
            "font-body text-[14px] leading-5 font-medium text-silver-100 placeholder:text-silver-700",
            "outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_var(--ps-primary-glow)]",
          )}
          aria-label="Search your library"
        />
      </div>

      <div className="flex-1" />

      {/* Sort — ghost button cycles Title / Recently added / Size */}
      <button
        type="button"
        onClick={() => onSort(SORT_ORDER[(SORT_ORDER.indexOf(sort) + 1) % SORT_ORDER.length])}
        className="flex h-8 items-center gap-1.5 rounded-full px-3 font-body text-[12px] leading-4 font-medium text-silver-500 transition-colors hover:bg-white/5 hover:text-silver-300"
        title="Change sort order"
      >
        <ArrowUpDown size={14} />
        <span>{SORT_LABEL[sort]}</span>
      </button>

      {/* Rescan — secondary pill; spins while scanning (⌘R) */}
      <button
        type="button"
        onClick={onRescan}
        disabled={scanning}
        className={cx(
          "flex h-8 items-center gap-2 rounded-full border border-border-strong bg-bg-raised px-3.5",
          "font-display text-[13px] font-bold text-silver-300 transition-colors",
          scanning ? "cursor-default opacity-70" : "hover:border-primary-500 hover:text-silver-100",
        )}
        title="Rescan library (⌘R)"
      >
        <RefreshCw size={14} className={scanning ? "animate-spin" : undefined} />
        <span>{scanning ? "Scanning…" : "Rescan"}</span>
      </button>

      {/* Amber progress hairline while scanning */}
      {scanning && (
        <motion.div
          className="absolute right-0 -bottom-px left-0 h-0.5 origin-left bg-amber"
          initial={{ scaleX: 0, opacity: 0.9 }}
          animate={{ scaleX: [0, 0.85, 0.95], opacity: 1 }}
          transition={{ duration: 2.4, ease: "easeOut" }}
        />
      )}
    </header>
  );
});
