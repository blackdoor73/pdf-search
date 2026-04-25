"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, durationMs = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-4), { id, type, message, durationMs }]);
      const timer = setTimeout(() => remove(id), durationMs);
      timers.current.set(id, timer);
    },
    [remove]
  );

  const ctx: ToastContextValue = {
    toast,
    success: (m) => toast("success", m),
    error: (m) => toast("error", m, 6000),
    warning: (m) => toast("warning", m),
    info: (m) => toast("info", m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Container ────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)] shrink-0" />,
  error: <XCircle className="w-3.5 h-3.5 text-[var(--red)] shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />,
  info: <Info className="w-3.5 h-3.5 text-[var(--blue)] shrink-0" />,
};

const STYLES: Record<ToastType, string> = {
  success: "border-green-500/20 bg-green-500/8",
  error: "border-red-500/20 bg-red-500/8",
  warning: "border-yellow-500/20 bg-yellow-500/8",
  info: "border-blue-500/20 bg-blue-500/8",
};

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            "flex items-start gap-3 px-3 py-3 border animate-slide-in",
            "bg-[var(--surface)] shadow-xl",
            STYLES[t.type]
          )}
        >
          {ICONS[t.type]}
          <p className="font-mono text-xs text-[var(--text-2)] flex-1 leading-relaxed">
            {t.message}
          </p>
          <button
            onClick={() => onRemove(t.id)}
            className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
