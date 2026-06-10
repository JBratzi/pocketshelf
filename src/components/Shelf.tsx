// Shelf — responsive game grid with staggered entrance + keyboard nav
// (design-system.md §4.1, §5.3, §7.3).

import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { Game } from "../types";
import { GameCard } from "./GameCard";

interface ShelfProps {
  games: Game[];
  /** Re-keys the entrance animation (platform filter changes only). */
  entranceKey: string;
  selectedId: string | null;
  onSelect: (game: Game | null) => void;
  onOpenDetail: (game: Game) => void;
  onPlay: (game: Game) => void;
}

export function Shelf({
  games,
  entranceKey,
  selectedId,
  onSelect,
  onOpenDetail,
  onPlay,
}: ShelfProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const columnCount = useCallback((): number => {
    const el = gridRef.current;
    if (!el) return 1;
    const cols = getComputedStyle(el).gridTemplateColumns.split(" ").length;
    return Math.max(1, cols);
  }, []);

  // Arrow-key grid selection · Enter opens DetailPanel · ⌘Enter = Play (§7.3).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (games.length === 0) return;

      const idx = selectedId ? games.findIndex((g) => g.id === selectedId) : -1;
      const cols = columnCount();
      let next = idx;

      switch (e.key) {
        case "ArrowRight":
          next = idx < 0 ? 0 : Math.min(idx + 1, games.length - 1);
          break;
        case "ArrowLeft":
          next = idx < 0 ? 0 : Math.max(idx - 1, 0);
          break;
        case "ArrowDown":
          next = idx < 0 ? 0 : Math.min(idx + cols, games.length - 1);
          break;
        case "ArrowUp":
          next = idx < 0 ? 0 : Math.max(idx - cols, 0);
          break;
        case "Enter": {
          if (idx >= 0) {
            e.preventDefault();
            if (e.metaKey) onPlay(games[idx]);
            else onOpenDetail(games[idx]);
          }
          return;
        }
        default:
          return;
      }

      e.preventDefault();
      if (next !== idx && next >= 0) {
        onSelect(games[next]);
        gridRef.current
          ?.querySelector(`[data-game-id="${games[next].id}"]`)
          ?.scrollIntoView({ block: "nearest" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [games, selectedId, columnCount, onSelect, onOpenDetail, onPlay]);

  return (
    <motion.div
      key={entranceKey}
      ref={gridRef}
      initial="hidden"
      animate="show"
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 p-6"
      role="grid"
      aria-label="Game library"
    >
      {games.map((game, i) => (
        <div key={game.id} data-game-id={game.id} role="gridcell">
          <GameCard
            game={game}
            index={i}
            selected={game.id === selectedId}
            onSelect={onOpenDetail}
            onPlay={onPlay}
          />
        </div>
      ))}
    </motion.div>
  );
}
