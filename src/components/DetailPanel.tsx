// DetailPanel — slide-in launcher (design-system.md §4.4, §5.4):
// Play + playtime stats + save-slot manager + metadata.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  Archive,
  Check,
  Copy,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Game, GameStats, SaveInfo } from "../types";
import { iconDataUri } from "../types";
import { spring } from "../animations";
import * as ipc from "../dev/safeIpc";
import { useToast } from "./Toast";
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  middleTruncate,
  monogramLetter,
  monogramStyle,
} from "../utils";
import { PlatformBadge } from "./PlatformBadge";

interface DetailPanelProps {
  game: Game;
  emulatorApp: string;
  onPlay: (game: Game) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-[11px] font-bold tracking-[0.08em] text-silver-500 uppercase">
      {children}
    </h3>
  );
}

/** Playtime stats + save-slot manager. Refreshes while the panel is open so
 * a session that just ended shows up without reopening the panel. */
function LauncherSections({ game }: { game: Game }) {
  const { toast } = useToast();
  const [stats, setStats] = useState<GameStats | null>(null);
  const [saves, setSaves] = useState<SaveInfo | null>(null);
  const [slotName, setSlotName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [st, sv] = await Promise.all([
        ipc.getStats(game.id),
        ipc.listSaves(game.path, game.id),
      ]);
      setStats(st);
      setSaves(sv);
    } catch {
      // Panel data is best-effort; the toast noise isn't worth it on poll.
    }
  }, [game.id, game.path]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 20_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function run(action: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try {
      await action();
      toast("success", okMsg);
      await refresh();
    } catch (err) {
      toast("error", String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Playtime */}
      <div className="mt-4 flex flex-col gap-2 px-6">
        <SectionTitle>Playtime</SectionTitle>
        <div className="flex items-stretch gap-2">
          {[
            { label: "Played", value: formatDuration(stats?.seconds_played ?? 0) },
            { label: "Sessions", value: String(stats?.sessions ?? 0) },
            { label: "Last", value: stats ? formatDateTime(stats.last_played) : "—" },
          ].map((cell) => (
            <div
              key={cell.label}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-bg-raised px-2 py-2.5"
            >
              <span className="font-mono text-[13px] leading-4 font-bold text-silver-100">
                {cell.value}
              </span>
              <span className="font-body text-[10px] leading-3 font-medium text-silver-500">
                {cell.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Saves */}
      <div className="mt-5 flex flex-col gap-2 px-6">
        <SectionTitle>Saves</SectionTitle>

        {saves?.live ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-bg-raised px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="font-body text-xs font-bold text-silver-100">
                Current save
              </span>
              <span className="font-mono text-[10px] leading-4 text-silver-500">
                {formatBytes(saves.live.size_bytes)} · {formatDateTime(saves.live.modified_at)}
              </span>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(
                  () => ipc.backupSave(game.path, game.id, slotName),
                  "Save backed up to a new slot",
                )
              }
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 font-display text-[11px] font-bold text-silver-300 transition-colors hover:border-primary-500 hover:text-silver-100 disabled:opacity-50"
              title="Snapshot the current save into a named slot"
            >
              <Archive size={12} />
              Backup
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-strong px-3 py-2.5 text-center font-body text-xs font-medium text-silver-700">
            No save file yet — play first, your progress will appear here.
          </p>
        )}

        {saves?.live && (
          <input
            type="text"
            value={slotName}
            onChange={(e) => setSlotName(e.target.value)}
            placeholder="Slot name (optional) — e.g. “before Elite Four”"
            className="h-8 rounded-[10px] bg-bg-raised px-3 font-body text-xs text-silver-300 placeholder:text-silver-700 focus:outline-1 focus:outline-primary-500"
          />
        )}

        {(saves?.states ?? []).length > 0 && (
          <>
            <p className="mt-1 font-body text-[10px] leading-4 font-medium text-silver-700">
              Quick-saves (melonDS F1–F8 states — load them in-game with F1–F8)
            </p>
            {(saves?.states ?? []).map((st) => (
              <div
                key={st.file_name}
                className="flex items-center justify-between gap-2 rounded-xl border border-border-default px-3 py-1.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-body text-xs font-bold text-silver-300">
                    F{st.file_name.slice(-1)} quick-save
                  </span>
                  <span className="font-mono text-[10px] leading-4 text-silver-500">
                    {formatBytes(st.size_bytes)} · {formatDateTime(st.modified_at)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => ipc.deleteSavestate(game.path, st.file_name),
                      "Quick-save deleted",
                    )
                  }
                  className="shrink-0 rounded-full p-1.5 text-silver-500 transition-colors hover:bg-white/5 hover:text-coral disabled:opacity-50"
                  title="Delete this quick-save state"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </>
        )}

        {(saves?.slots ?? []).map((slot) => (
          <div
            key={slot.file_name}
            className="flex items-center justify-between gap-2 rounded-xl bg-bg-raised px-3 py-2"
          >
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate font-body text-xs font-bold text-silver-300"
                title={slot.file_name}
              >
                {slot.file_name.replace(/\.sav$/, "")}
              </span>
              <span className="font-mono text-[10px] leading-4 text-silver-500">
                {formatBytes(slot.size_bytes)} · {formatDateTime(slot.modified_at)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => ipc.restoreSave(game.path, game.id, slot.file_name),
                    "Slot restored — previous save kept as .sav.bak",
                  )
                }
                className="rounded-full p-1.5 text-silver-500 transition-colors hover:bg-white/5 hover:text-primary-300 disabled:opacity-50"
                title="Restore this slot (becomes the save the emulator loads)"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => ipc.deleteSaveSlot(game.id, slot.file_name),
                    "Slot deleted",
                  )
                }
                className="rounded-full p-1.5 text-silver-500 transition-colors hover:bg-white/5 hover:text-coral disabled:opacity-50"
                title="Delete this slot"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
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

      {/* Launcher: playtime + saves */}
      <LauncherSections game={game} />

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
