"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ToastKind } from "@/lib/toast";

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

let nextId = 1;

const KIND_STYLE: Record<ToastKind, { bg: string; Icon: typeof Info }> = {
  success: { bg: "#1b5e20", Icon: CheckCircle2 },
  error: { bg: "#b3261e", Icon: AlertCircle },
  info: { bg: "#1a1a1a", Icon: Info },
};

// Renders toasts emitted via lib/toast. Oat-agnostic on purpose (see oat.tsx).
// Solid-fill cards with white text for contrast; click a toast to dismiss early.
export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail as { message: string; kind: ToastKind };
      const id = nextId++;
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
    };
    window.addEventListener("gs:toast", onToast);
    return () => window.removeEventListener("gs:toast", onToast);
  }, []);

  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 w-[min(92vw,28rem)]">
      {toasts.map((t) => {
        const { bg, Icon } = KIND_STYLE[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            title="Dismiss"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="gs-toast flex items-start gap-2.5 text-sm font-medium px-4 py-3 cursor-pointer"
            style={{
              background: bg,
              color: "#fff",
              borderRadius: 16,
              boxShadow: "0 12px 32px rgb(0 0 0 / 0.28), 0 2px 8px rgb(0 0 0 / 0.2)",
              maxWidth: "100%",
            }}
          >
            <Icon size={17} aria-hidden className="mt-0.5 shrink-0" />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
