"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";

const ENDPOINT: Record<string, (id: string) => string> = {
  project: (id) => `/api/projects/${id}`,
  sapling: (id) => `/api/saplings/${encodeURIComponent(id)}`,
  species: (id) => `/api/species/${id}`,
};

// PRD §3.2: admins can restore soft-deleted records.
export function RestoreButton({ kind, id }: { kind: keyof typeof ENDPOINT; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const restore = async () => {
    setBusy(true);
    try {
      await apiFetch(ENDPOINT[kind](id), { method: "POST" });
      toast("Restored.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Restore failed.", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={busy} onClick={restore}>
      {busy ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <RotateCcw size={14} aria-hidden />}
      {busy ? "Restoring…" : "Restore"}
    </button>
  );
}
