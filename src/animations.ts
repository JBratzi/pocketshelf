// PocketShelf motion specs — design-system.md §5.
// Springs everywhere; respect prefers-reduced-motion (handled per-component).

export const spring = {
  /** hovers, presses (~180ms) */
  snappy: { type: "spring", stiffness: 420, damping: 30 },
  /** panels, layout (~320ms) */
  smooth: { type: "spring", stiffness: 260, damping: 28 },
  /** playful: empty-state, toasts (~450ms) */
  bouncy: { type: "spring", stiffness: 300, damping: 18, mass: 0.9 },
} as const;

export const easeOut = [0.16, 1, 0.3, 1] as const;

/** Stagger cap (§5.3): cards past this index enter without extra delay. */
export const STAGGER_CAP = 24;

/**
 * Grid entrance — staggered (§5.3). Delay is computed per-card from its
 * index (capped) so large libraries never feel slow.
 */
export const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...spring.smooth,
      delay: 0.05 + Math.min(index, STAGGER_CAP) * 0.03,
    },
  }),
} as const;
