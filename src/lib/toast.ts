// Tiny event-bus toast. Any component (or lib) can `toast(msg)`; the
// `<ToastHost />` in the root layout renders them. Keeps Oat-agnostic UI
// while we evaluate Oat's own toast web component in the spike.
"use client";

export type ToastKind = "info" | "success" | "error";

export function toast(message: string, kind: ToastKind = "info"): void {
  window.dispatchEvent(new CustomEvent("gs:toast", { detail: { message, kind } }));
}
