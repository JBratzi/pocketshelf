// Platform badge — plain factual descriptor only, never stylized branding
// (architecture.md legal rules; design-system.md §1.4).

import type { Platform } from "../types";

const STYLES: Record<Platform, { color: string; bg: string }> = {
  gba: { color: "#8B7BF4", bg: "rgba(139,123,244,0.15)" },
  nds: { color: "#5FB7D4", bg: "rgba(95,183,212,0.15)" },
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  const s = STYLES[platform];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] leading-[14px] font-bold tracking-[0.08em] uppercase"
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}40` }}
    >
      {platform}
    </span>
  );
}
