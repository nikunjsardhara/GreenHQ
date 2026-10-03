"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

// Reusable modal built on the native <dialog> element (Escape to close,
// backdrop click to close, focus handled by the browser).
export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel = "Save",
  onConfirm,
  busy = false,
  confirmDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  busy?: boolean;
  confirmDisabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open ]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="gs-card gs-float p-5 w-[min(92vw,28rem)] rounded-3xl backdrop:bg-black/50"
    >
      <h2 className="text-lg font-bold text-[var(--gs-ink)]">{title}</h2>
      <div className="mt-3 text-sm">{children}</div>
      <div className="flex gap-2 mt-5">
        <button type="button" className="gs-chip flex-1 justify-center inline-flex items-center gap-1.5" onClick={onClose} disabled={busy}>
          <X size={14} aria-hidden />
          Cancel
        </button>
        <button
          type="button"
          className="gs-chip flex-1 justify-center inline-flex items-center gap-1.5"
          style={{ background: "var(--gs-ink)", color: "#fff" }}
          onClick={onConfirm}
          disabled={busy || confirmDisabled}
        >
          <Check size={14} aria-hidden />
          {busy ? "Saving…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
