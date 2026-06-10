// Toast notifications — design-system.md §4.7 + §5.5.
// Bottom-right stack, max 3 visible, auto-dismiss 4s (error 6s), hover pauses.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { spring } from "../animations";

export type ToastVariant = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: "text-mint",
  info: "text-primary-400",
  warning: "text-amber",
  error: "text-coral",
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const arm = useCallback(
    (id: number, variant: ToastVariant) => {
      const ms = variant === "error" ? 6000 : 4000;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
    },
    [dismiss],
  );

  const toast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, variant, message }]); // max 3 visible
      arm(id, variant);
    },
    [arm],
  );

  const pause = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1, transition: spring.bouncy }}
                exit={{ x: 80, opacity: 0, transition: { duration: 0.18 } }}
                onMouseEnter={() => pause(t.id)}
                onMouseLeave={() => arm(t.id, t.variant)}
                className="pointer-events-auto flex max-w-[360px] items-start gap-3 rounded-xl bg-bg-overlay px-4 py-3"
                style={{ boxShadow: "var(--ps-shadow-overlay)" }}
                role="status"
              >
                <Icon size={16} className={`${ICON_COLOR[t.variant]} mt-0.5 shrink-0`} />
                <p className="font-body text-[14px] leading-5 font-medium text-silver-100">
                  {t.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="ml-1 shrink-0 rounded-md p-0.5 text-silver-500 hover:text-silver-100"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
