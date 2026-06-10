// Settings — modal sheet (design-system.md §4.6, §5.5).
// ROM folders (native picker via pick_folder IPC) + emulator app names.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Folder, FolderPlus, Gamepad2, Keyboard, Trash2, X } from "lucide-react";
import type { MelonStatus, Settings } from "../types";
import { spring } from "../animations";
import { middleTruncate } from "../utils";
import * as ipc from "../dev/safeIpc";
import { useToast } from "./Toast";

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
  onClose: () => void;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-display text-[17px] leading-6 font-bold text-silver-100">{children}</h3>
  );
}

export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [melon, setMelon] = useState<MelonStatus | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    void ipc.melondsStatus().then(setMelon).catch(() => setMelon(null));
  }, []);

  async function applyMapping(kind: "keyboard" | "dualsense") {
    setApplying(true);
    try {
      const msg =
        kind === "keyboard"
          ? await ipc.melondsApplyKeyboard()
          : await ipc.melondsApplyDualsense();
      toast("success", `melonDS: ${msg}`);
      setMelon(await ipc.melondsStatus());
    } catch (err) {
      toast("error", String(err));
    } finally {
      setApplying(false);
    }
  }

  // Esc closes (also handled globally, but the modal must win while open).
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

  async function addFolder() {
    try {
      const path = await ipc.pickFolder();
      if (path && !draft.rom_folders.includes(path)) {
        setDraft((d) => ({ ...d, rom_folders: [...d.rom_folders, path] }));
      }
    } catch (err) {
      toast("error", String(err));
    }
  }

  function removeFolder(path: string) {
    setDraft((d) => ({ ...d, rom_folders: d.rom_folders.filter((f) => f !== path) }));
  }

  function removeFile(path: string) {
    setDraft((d) => ({ ...d, rom_files: d.rom_files.filter((f) => f !== path) }));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      toast("success", "Settings saved");
      onClose();
    } catch {
      // updateSettings already showed the error toast; keep the modal open
      // so the user can retry without losing the draft.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[8px]"
      />

      {/* Sheet */}
      <motion.div
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 10, opacity: 0 }}
        transition={spring.smooth}
        className="relative flex max-h-[80vh] w-[560px] flex-col overflow-hidden rounded-2xl bg-bg-overlay"
        style={{ boxShadow: "var(--ps-shadow-overlay)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="font-display text-[17px] leading-6 font-bold text-silver-100">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-silver-500 transition-colors hover:bg-white/5 hover:text-silver-100"
            aria-label="Close settings (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-7 overflow-y-auto px-6 pb-6">
          {/* ROM folders */}
          <section className="flex flex-col gap-3">
            <SectionTitle>ROM folders</SectionTitle>
            <p className="font-body text-xs leading-4 font-medium text-silver-500">
              Folders with your own cartridge dumps. Scanned recursively for .gba and .nds
              files.
            </p>
            {draft.rom_folders.length === 0 && (
              <p className="rounded-[10px] border border-dashed border-border-strong px-3 py-3 text-center font-body text-[14px] leading-5 font-medium text-silver-700">
                No folders yet
              </p>
            )}
            {draft.rom_folders.map((folder) => (
              <div
                key={folder}
                className="flex items-center gap-2.5 rounded-[10px] bg-bg-raised px-3 py-2"
              >
                <Folder size={16} className="shrink-0 text-silver-500" />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-xs leading-[18px] text-silver-300 select-text"
                  title={folder}
                >
                  {middleTruncate(folder, 52)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFolder(folder)}
                  className="shrink-0 rounded-md p-1 text-silver-500 transition-colors hover:text-coral"
                  aria-label={`Remove folder ${folder}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addFolder}
              className="flex h-9 w-fit items-center gap-2 rounded-full border border-border-strong px-4 font-display text-[13px] font-bold text-silver-300 transition-colors hover:border-primary-500 hover:text-silver-100"
            >
              <FolderPlus size={15} />
              Add folder…
            </button>
          </section>

          {/* Individual ROM files (added via drag & drop) */}
          {draft.rom_files.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionTitle>Dropped files</SectionTitle>
              <p className="font-body text-xs leading-4 font-medium text-silver-500">
                Individual ROMs added by dropping them onto the window.
              </p>
              {draft.rom_files.map((file) => (
                <div
                  key={file}
                  className="flex items-center gap-2.5 rounded-[10px] bg-bg-raised px-3 py-2"
                >
                  <Folder size={16} className="shrink-0 text-silver-500" />
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-xs leading-[18px] text-silver-300 select-text"
                    title={file}
                  >
                    {middleTruncate(file, 52)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="shrink-0 rounded-md p-1 text-silver-500 transition-colors hover:text-coral"
                    aria-label={`Remove file ${file}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* melonDS integration */}
          <section className="flex flex-col gap-3">
            <SectionTitle>melonDS integration</SectionTitle>
            <p className="font-body text-xs leading-4 font-medium text-silver-500">
              PocketShelf can write the control mappings straight into melonDS&apos;s
              config (a .bak backup is kept). Quit melonDS before applying.
            </p>
            {melon && !melon.config_found && (
              <p className="rounded-[10px] border border-dashed border-border-strong px-3 py-2.5 font-body text-xs font-medium text-silver-500">
                melonDS config not found yet — open melonDS once, quit it, then
                come back here.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={applying || !melon?.config_found}
                onClick={() => applyMapping("keyboard")}
                className="flex h-9 items-center gap-2 rounded-full border border-border-strong px-4 font-display text-[13px] font-bold text-silver-300 transition-colors hover:border-primary-500 hover:text-silver-100 disabled:opacity-50"
              >
                <Keyboard size={15} />
                {melon?.keyboard_mapped ? "Re-apply keyboard keys" : "Set up keyboard keys"}
              </button>
              <button
                type="button"
                disabled={applying || !melon?.config_found}
                onClick={() => applyMapping("dualsense")}
                className="flex h-9 items-center gap-2 rounded-full border border-border-strong px-4 font-display text-[13px] font-bold text-silver-300 transition-colors hover:border-primary-500 hover:text-silver-100 disabled:opacity-50"
              >
                <Gamepad2 size={15} />
                {melon?.joystick_mapped ? "Re-apply PS5 controller" : "Set up PS5 controller"}
              </button>
            </div>
            <p className="font-body text-[11px] leading-4 font-medium text-silver-700">
              Keyboard: arrows = D-pad · X/Z/S/A = A/B/X/Y · Q/W = L/R · Enter =
              Start · Shift = Select · Tab = fast-forward · F11 = fullscreen.
              Controller: pair the DualSense via Bluetooth first; if a button
              doesn&apos;t respond, fine-tune in melonDS → Config → Input.
            </p>
          </section>

          {/* Emulators */}
          <section className="flex flex-col gap-3">
            <SectionTitle>Emulators</SectionTitle>
            <p className="font-body text-xs leading-4 font-medium text-silver-500">
              macOS application name used to open each file type (as in{" "}
              <span className="font-mono">open -a</span>).
            </p>
            {(
              [
                { key: "emulator_gba", label: "GBA", placeholder: "OpenEmu" },
                { key: "emulator_nds", label: "NDS", placeholder: "melonDS" },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <label key={key} className="flex items-center gap-3">
                {/* Factual platform descriptor only. */}
                <span className="w-12 font-body text-[14px] leading-5 font-bold text-silver-100">
                  {label}
                </span>
                <input
                  type="text"
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  placeholder={placeholder}
                  spellCheck={false}
                  className="h-9 flex-1 rounded-[10px] border border-border-strong bg-bg-raised px-3 font-body text-[14px] leading-5 font-medium text-silver-100 outline-none placeholder:text-silver-700 focus:border-primary-500 focus:shadow-[0_0_0_3px_var(--ps-primary-glow)]"
                />
              </label>
            ))}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border-default px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-display text-[14px] font-bold text-silver-500 transition-colors hover:text-silver-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-primary-500 px-5 py-2 font-display text-[14px] font-bold text-white transition-colors hover:bg-primary-600 active:bg-primary-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
