// DetailPanel — slide-in from the right (design-system.md §4.4, §5.4).

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Copy, Play, X } from "lucide-react";
import type { Game } from "../types";
import { iconDataUri } from "../types";
import { spring } from "../animations";
import { formatBytes, middleTruncate, monogramLetter, monogramStyle } from "../utils";
import { PlatformBadge } from "./PlatformBadge";

interface DetailPanelProps {
  game: Game;
  emulatorApp: string;
  onPlay: (game: Game) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="shrink-0 font-body text-xs leading-4 font-medium text-silver-500">
        {label}
      </span>
      <span className="min-w-0 text-right font-mono text-xs leading-[18px] text-silver-300 select-text">
        {children}
      </span>
    </div>
  );
}

export function DetailPanel({
  game,
  emulatorApp,
  onPlay,
  onClose,
  onOpenSettings,
}: DetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const icon = iconDataUri(game);
  const hasEmulator = emulatorApp.trim().length > 0;

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(game.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — non-fatal
    }
  }

  return (
    <motion.aside
      initial={{ x: 340, opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={spring.smooth}
      className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-l border-border-default bg-bg-surface"
      aria-label="Game details"
    >
      {/* Hero */}
      <div className="ps-scanlines relative flex flex-col items-center px-6 pt-10 pb-5">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(108,92,231,.18), transparent 70%)",
          }}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-1.5 text-silver-500 transition-colors hover:bg-white/5 hover:text-silver-100"
          aria-label="Close details (Esc)"
        >
          <X size={16} />
        </button>

        {icon ? (
          <img
            src={icon}
            alt=""
            draggable={false}
            className="relative h-24 w-24 rounded-2xl"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-2xl"
            style={monogramStyle(game.internal_title)}
          >
            <span className="font-display text-4xl font-extrabold text-silver-100/90 select-none">
              {monogramLetter(game.internal_title)}
            </span>
          </div>
        )}
      </div>

      {/* Title + badge */}
      <div className="flex flex-col items-center gap-2 px-6 pb-5 text-center">
        <h2 className="font-display text-[22px] leading-7 font-extrabold text-silver-100">
          {game.internal_title}
        </h2>
        <PlatformBadge platform={game.platform} />
      </div>

      {/* Play */}
      <div className="px-6 pb-2">
        <motion.button
          type="button"
          disabled={!hasEmulator}
          onClick={() => onPlay(game)}
          whileHover={hasEmulator ? { scale: 1.02 } : undefined}
          whileTap={hasEmulator ? { scale: 0.98 } : undefined}
          transition={spring.snappy}
          className={
            hasEmulator
              ? "flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-500 font-display text-base font-bold text-white transition-colors hover:bg-primary-600 active:bg-primary-700"
              : "flex h-11 w-full cursor-default items-center justify-center gap-2 rounded-full bg-bg-raised font-display text-base font-bold text-silver-700"
          }
          style={hasEmulator ? { boxShadow: "var(--ps-glow-primary)" } : undefined}
        >
          <Play size={18} fill="currentColor" />
          Play
        </motion.button>
        {!hasEmulator && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-2 w-full text-center font-body text-xs leading-4 font-medium text-primary-400 hover:text-primary-300"
          >
            Choose an emulator in Settings
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-2 flex flex-col divide-y divide-border-default px-6 pb-8">
        <MetaRow label="Internal title">{game.internal_title}</MetaRow>
        <MetaRow label="Game code">{game.game_code || "—"}</MetaRow>
        <MetaRow label="File size">{formatBytes(game.size_bytes)}</MetaRow>
        <MetaRow label="File name">{middleTruncate(game.file_name, 30)}</MetaRow>
        <div className="group flex items-center justify-between gap-3 py-2">
          <span className="shrink-0 font-body text-xs leading-4 font-medium text-silver-500">
            Path
          </span>
          <button
            type="button"
            onClick={copyPath}
            title={game.path}
            className="flex min-w-0 items-center gap-1.5 text-right font-mono text-xs leading-[18px] text-silver-300 hover:text-silver-100"
          >
            <span className="truncate">{middleTruncate(game.path, 32)}</span>
            {copied ? (
              <Check size={12} className="shrink-0 text-mint" />
            ) : (
              <Copy
                size={12}
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              />
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
