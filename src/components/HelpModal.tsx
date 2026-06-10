// HelpModal — keyboard tutorial: PocketShelf shortcuts + how to play in
// melonDS (touch, savestates, recommended key mapping). Opened with ? / ⌘/.

import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { spring } from "../animations";

interface HelpModalProps {
  onClose: () => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-[11px] font-bold tracking-[0.08em] text-silver-500 uppercase">
      {children}
    </h3>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border-strong bg-bg-raised px-1.5 font-mono text-[11px] font-bold text-silver-100">
      {children}
    </kbd>
  );
}

function Row({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="font-body text-[13px] leading-5 font-medium text-silver-300">
        {children}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((k) => (
          <Key key={k}>{k}</Key>
        ))}
      </span>
    </div>
  );
}

export function HelpModal({ onClose }: HelpModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[8px]"
      />

      <motion.div
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={spring.smooth}
        className="relative flex max-h-[82vh] w-[600px] flex-col overflow-hidden rounded-2xl bg-bg-overlay"
        style={{ boxShadow: "var(--ps-shadow-overlay)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard tutorial"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="font-display text-[17px] leading-6 font-bold text-silver-100">
            Keyboard tutorial
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-silver-500 transition-colors hover:bg-white/5 hover:text-silver-100"
            aria-label="Close help (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-6 pb-6">
          <section className="flex flex-col gap-1">
            <SectionTitle>Library</SectionTitle>
            <Row keys={["⌘", "F"]}>Search your shelf</Row>
            <Row keys={["⌘", "R"]}>Rescan ROM folders</Row>
            <Row keys={["⌘", ","]}>Open Settings</Row>
            <Row keys={["?"]}>Open this tutorial</Row>
            <Row keys={["Esc"]}>Close panel / clear search</Row>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="font-body text-[13px] leading-5 font-medium text-silver-300">
                Play a game
              </span>
              <span className="font-body text-xs text-silver-500">
                double-click its card, or ▶ in the panel
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="font-body text-[13px] leading-5 font-medium text-silver-300">
                Add games
              </span>
              <span className="font-body text-xs text-silver-500">
                drag & drop .gba/.nds anywhere on the window
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-1">
            <SectionTitle>Saves & playtime (game panel)</SectionTitle>
            <p className="py-1 font-body text-[13px] leading-5 font-medium text-silver-300">
              Click a game to open its panel: <b className="text-silver-100">Backup</b>{" "}
              snapshots your current save into a named slot;{" "}
              <b className="text-silver-100">restore</b> (↺) makes a slot the save the
              emulator loads — the one being replaced survives as{" "}
              <span className="font-mono text-xs">.sav.bak</span>. Hours played count
              automatically while the emulator is open.
            </p>
          </section>

          <section className="flex flex-col gap-1">
            <SectionTitle>Playing in melonDS</SectionTitle>
            <Row keys={["🖱"]}>Touchscreen = click/drag on the bottom screen</Row>
            <Row keys={["Shift", "F1"]}>Quick-save state (slots F1–F8)</Row>
            <Row keys={["F1"]}>Load state (slots F1–F8)</Row>
            <p className="mt-2 rounded-xl bg-bg-raised px-3 py-2.5 font-body text-xs leading-5 font-medium text-silver-500">
              <b className="text-silver-300">First time?</b> Go to{" "}
              <span className="font-mono">Settings → melonDS integration</span> and
              click <b className="text-silver-300">Set up keyboard keys</b> (and{" "}
              <b className="text-silver-300">Set up PS5 controller</b> if you have a
              DualSense paired) — PocketShelf writes the mapping into melonDS for you:{" "}
              <span className="font-mono text-silver-300">
                Arrows = D-pad · X = A · Z = B · S = X · A = Y · Q = L · W = R · Enter =
                Start · Shift = Select · Tab = fast-forward · F11 = fullscreen
              </span>
              . Quick-save states are different from the in-game save — use the in-game
              save (the one PocketShelf backs up) for real progress.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
