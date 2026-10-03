"use client";

import { useGlobalPending } from "@/lib/pending";

// Slim indeterminate progress bar pinned to the viewport top. Visible during
// every tracked API round-trip, the loader between user interaction and UI
// update. Purely additive: pointer-events-none, never blocks input.
export function GlobalLoader() {
  const pending = useGlobalPending();
  if (!pending) return null;
  return (
    <div role="status" aria-label="Working…" className="gs-progress no-print" aria-hidden={false}>
      <span />
    </div>
  );
}
