// PocketShelf — small pure UI helpers.

import type { CSSProperties } from "react";

/** Human-readable file size, e.g. "12.4 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes;
  let u = -1;
  do {
    v /= 1024;
    u += 1;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(1)} ${units[u]}`;
}

/** Middle-truncates long paths: "/Users/…/roms/my-dump.gba". */
export function middleTruncate(text: string, max = 42): string {
  if (text.length <= max) return text;
  const keep = Math.floor((max - 1) / 2);
  return `${text.slice(0, keep)}…${text.slice(text.length - keep)}`;
}

/** Tiny deterministic hash for stable per-title variation. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * GBA placeholder tile (no internal icon in the format): an original
 * indigo-to-graphite gradient monogram generated from the game title.
 * Hue is nudged deterministically per title so shelves feel hand-placed.
 */
export function monogramStyle(title: string): CSSProperties {
  const h = hashString(title);
  // Stay in the indigo/violet family (design-system §4.1) — subtle variation only.
  const hue = 242 + (h % 28) - 14; // 228..255
  const angle = 115 + (h % 50); // 115..164deg
  return {
    background: `linear-gradient(${angle}deg, hsl(${hue} 49% 45%), #23232d 92%)`,
  };
}

/** First letter for the monogram tile. */
export function monogramLetter(title: string): string {
  const m = title.match(/[a-zA-Z0-9]/);
  return (m ? m[0] : "?").toUpperCase();
}

/** classNames helper. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** "2h 15m" / "45m" / "<1m". Total play time display. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return "<1m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Compact local date-time for save slots / last played. */
export function formatDateTime(epochMs: number): string {
  if (!epochMs) return "—";
  return new Date(epochMs).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
