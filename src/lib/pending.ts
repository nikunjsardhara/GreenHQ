// Global in-flight request tracker, powers the top progress bar so every
// server round-trip (saves, deletes, status changes, lookups, navigations
// that refetch) shows a loader between the interaction and the UI update.
// Framework-agnostic (no window access): safe to import anywhere.
import { useEffect, useState } from "react";

let inFlight = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Wrap a promise so the global loader is visible while it settles. */
export function trackPending<T>(promise: Promise<T>): Promise<T> {
  inFlight += 1;
  emit();
  return promise.finally(() => {
    inFlight = Math.max(0, inFlight - 1);
    emit();
  });
}

/** True while any tracked request is in flight. Client components only. */
export function useGlobalPending(): boolean {
  const [pending, setPending] = useState(inFlight > 0);
  useEffect(() => {
    const sync = () => setPending(inFlight > 0);
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return pending;
}
