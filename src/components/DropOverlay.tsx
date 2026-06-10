// DropOverlay — full-window drop target shown while ROM files/folders are
// dragged over the window (Tauri onDragDropEvent drives visibility).

import { motion } from "motion/react";
import { Download } from "lucide-react";

export function DropOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-primary-400 bg-bg-surface/90 px-14 py-12">
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white"
          style={{ boxShadow: "var(--ps-glow-primary)" }}
        >
          <Download size={26} />
        </motion.span>
        <p className="font-display text-xl font-extrabold text-silver-100">
          Drop it on the shelf
        </p>
        <p className="font-body text-sm text-silver-500">
          .gba / .nds files or whole folders
        </p>
      </div>
    </motion.div>
  );
}
