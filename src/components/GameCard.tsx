// GameCard — design-system.md §4.1 + motion §5.2/§5.3.

import { memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Play } from "lucide-react";
import type { Game } from "../types";
import { iconDataUri } from "../types";
import { cardVariants } from "../animations";
import { cx, formatBytes, monogramLetter, monogramStyle } from "../utils";
import { PlatformBadge } from "./PlatformBadge";

interface GameCardProps {
  game: Game;
  index: number;
  selected: boolean;
  onSelect: (game: Game) => void;
  onPlay: (game: Game) => void;
}

function GameCardInner({ game, index, selected, onSelect, onPlay }: GameCardProps) {
  const reduced = useReducedMotion();
  const icon = iconDataUri(game);

  return (
    <motion.button
      type="button"
      variants={cardVariants}
      custom={index}
      whileHover={
        reduced ? undefined : { scale: 1.03, rotate: index % 2 ? 1 : -1, y: -4 }
      }
      whileTap={reduced ? undefined : { scale: 0.98, rotate: 0 }}
      onClick={() => onSelect(game)}
      onDoubleClick={() => onPlay(game)}
      className={cx(
        "ps-card group relative flex w-full cursor-default flex-col gap-2 rounded-2xl bg-bg-surface p-3 text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
        selected && "ring-2 ring-primary-500 ring-offset-2 ring-offset-bg-base",
      )}
      style={{ boxShadow: "var(--ps-shadow-card)" }}
      aria-label={`${game.internal_title} (${game.platform})`}
      data-selected={selected || undefined}
    >
      {/* Cover */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-bg-raised">
        {icon ? (
          <img
            src={icon}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={monogramStyle(game.internal_title)}
          >
            <span className="font-display text-5xl font-extrabold text-silver-100/90 select-none">
              {monogramLetter(game.internal_title)}
            </span>
          </div>
        )}
        {/* Hover quick-play */}
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onPlay(game);
          }}
          className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-primary-600"
          style={{ boxShadow: "var(--ps-glow-primary)" }}
          title="Play"
        >
          <Play size={14} fill="currentColor" />
        </span>
      </div>

      {/* Title — 2-line clamp */}
      <p className="line-clamp-2 min-h-10 font-body text-[14px] leading-5 font-bold text-silver-100">
        {game.internal_title}
      </p>

      {/* Badge + size */}
      <div className="flex items-center justify-between">
        <PlatformBadge platform={game.platform} />
        <span className="font-mono text-xs leading-[18px] text-silver-500">
          {formatBytes(game.size_bytes)}
        </span>
      </div>
    </motion.button>
  );
}

export const GameCard = memo(GameCardInner);
