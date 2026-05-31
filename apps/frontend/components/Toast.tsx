"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type ToastKind = "error" | "success";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "error") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => remove(id), DISMISS_MS);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <section
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border-l-4 bg-surface px-4 py-3 text-sm shadow-lg",
              t.kind === "error" ? "border-danger" : "border-success",
            )}
            role="status"
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </section>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
