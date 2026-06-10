// EmptyState — design-system.md §4.5. Copy never suggests downloading ROMs;
// PocketShelf catalogs the user's own cartridge dumps.

import { motion, useReducedMotion } from "motion/react";
import { FilePlus2, FolderPlus } from "lucide-react";
import { spring } from "../animations";

interface EmptyStateProps {
  variant: "no-folders" | "no-games" | "no-results";
  query?: string;
  onAddFolder: () => void;
  onAddFiles?: () => void;
  onClearSearch?: () => void;
}

const COPY: Record<EmptyStateProps["variant"], { emoji: string; headline: string; body: string }> =
  {
    "no-folders": {
      emoji: "🕹️",
      headline: "Your shelf is empty",
      body: "Point PocketShelf at the folder where you keep your own cartridge dumps and it will catalog everything.",
    },
    "no-games": {
      emoji: "🕹️",
      headline: "Nothing on the shelf yet",
      body: "No .gba or .nds files were found in your folders. Add another folder or rescan after moving your dumps in.",
    },
    "no-results": {
      emoji: "📦",
      headline: "No matches",
      body: "Nothing in your library matches that search.",
    },
  };

export function EmptyState({
  variant,
  query,
  onAddFolder,
  onAddFiles,
  onClearSearch,
}: EmptyStateProps) {
  const reduced = useReducedMotion();
  const copy = COPY[variant];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.bouncy}
        className="flex flex-col items-center"
      >
        <motion.span
          className="text-8xl"
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={
            reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
          }
          role="img"
          aria-hidden
        >
          {copy.emoji}
        </motion.span>
        {/* CSS shelf */}
        <div
          className="mt-1 h-2 w-[140px] rounded-full bg-bg-raised"
          style={{ boxShadow: "var(--ps-shadow-card)" }}
        />
      </motion.div>

      <h1 className="mt-6 font-display text-[28px] leading-[34px] font-extrabold text-silver-100">
        {variant === "no-results" && query ? `No matches for “${query}”` : copy.headline}
      </h1>
      <p className="max-w-[380px] font-body text-[14px] leading-5 font-medium text-silver-500">
        {copy.body}
      </p>

      {variant === "no-results" ? (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-4 rounded-full border border-border-strong px-5 py-2 font-display text-[14px] font-bold text-silver-300 transition-colors hover:border-primary-500 hover:text-silver-100"
        >
          Clear search
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onAddFolder}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            className="flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2.5 font-display text-[15px] font-bold text-white transition-colors hover:bg-primary-600 active:bg-primary-700"
            style={{ boxShadow: "var(--ps-glow-primary)" }}
          >
            <FolderPlus size={18} />
            Add your ROM folder
          </motion.button>
          {onAddFiles && (
            <motion.button
              type="button"
              onClick={onAddFiles}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
              className="flex items-center gap-2 rounded-full border border-border-strong px-6 py-2.5 font-display text-[15px] font-bold text-silver-300 transition-colors hover:border-primary-500 hover:text-silver-100"
            >
              <FilePlus2 size={18} />
              Add ROM files…
            </motion.button>
          )}
        </div>
      )}
      {variant !== "no-results" && (
        <p className="mt-3 font-body text-xs font-medium text-silver-700">
          …or just drag & drop .gba/.nds files anywhere on this window.
        </p>
      )}
    </div>
  );
}
