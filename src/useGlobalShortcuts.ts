// Global keyboard shortcuts — design-system.md §7.3.
// ⌘F focus search · ⌘R rescan (suppresses reload) · ⌘, settings ·
// ? or ⌘/ help tutorial · Esc close.

import { useEffect } from "react";

interface ShortcutHandlers {
  onFocusSearch: () => void;
  onRescan: () => void;
  onOpenSettings: () => void;
  onHelp: () => void;
  onEscape: () => void;
}

export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "f":
            e.preventDefault();
            handlers.onFocusSearch();
            return;
          case "r":
            e.preventDefault(); // suppress webview reload
            handlers.onRescan();
            return;
          case ",":
            e.preventDefault();
            handlers.onOpenSettings();
            return;
          case "/":
            e.preventDefault();
            handlers.onHelp();
            return;
        }
      }
      // "?" only when not typing in a field (search box must keep the char).
      if (
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        handlers.onHelp();
        return;
      }
      if (e.key === "Escape") {
        handlers.onEscape();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
