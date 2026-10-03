"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { listPending, syncOutbox } from "@/lib/outbox";

// Registers the service worker, syncs the offline outbox when connectivity
// returns, and exposes the pending-sync count (PRD §3.5 visible indicator).
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onOnline = () => {
      syncOutbox().catch(() => {});
    };
    // PRD §6.12 install prompt: stash the deferred prompt so UI can offer it.
    const onInstallable = (e: Event) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("gs:install-ready", { detail: e }));
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeinstallprompt", onInstallable);
    if (navigator.onLine) syncOutbox().catch(() => {});
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", onInstallable);
    };
  }, []);
  return null;
}

/** Renders an install button when the browser fires beforeinstallprompt. */
export function InstallButton() {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  useEffect(() => {
    const onReady = (e: Event) => setPrompt(e as Event & { prompt?: () => void });
    window.addEventListener("gs:install-ready", onReady);
    return () => window.removeEventListener("gs:install-ready", onReady);
  }, []);
  if (!prompt?.prompt) return null;
  return (
    <button
      type="button"
      className="gs-chip inline-flex items-center gap-1.5"
      onClick={() => {
        prompt.prompt?.();
        setPrompt(null);
      }}
    >
      <Download size={14} aria-hidden />
      Install app
    </button>
  );
}

export function usePendingSync(): number {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      try {
        const items = await listPending();
        if (live) setPending(items.length);
      } catch {
        /* IndexedDB unavailable (SSR/private mode) */
      }
    };
    refresh();
    window.addEventListener("gs:outbox-changed", refresh);
    window.addEventListener("online", refresh);
    return () => {
      live = false;
      window.removeEventListener("gs:outbox-changed", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);
  return pending;
}

export function SyncBadge() {
  const pending = usePendingSync();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline && pending === 0) return null;
  return (
    <div
      role="status"
      className="gs-chip no-print inline-flex items-center gap-1.5"
      style={{ background: "#fff8e1", borderColor: "#f9a825" }}
    >
      {offline ? <WifiOff size={14} aria-hidden /> : pending > 0 ? <RefreshCw size={14} aria-hidden /> : <Wifi size={14} aria-hidden />}
      {offline ? "Offline" : "Online"}
      {pending > 0 ? ` · ${pending} change${pending === 1 ? "" : "s"} pending sync` : ""}
    </div>
  );
}
