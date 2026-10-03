"use client";

import { useState } from "react";
import { BadgeCheck, Gift as GiftIcon, Loader2, Printer } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";

// No-account gift claim (PRD section 5.6): recipient gets growth updates afterwards.
export function ClaimIsland({ token, claimed }: { token: string; claimed: boolean }) {
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(claimed);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setDone(true); // optimistic (PRD §3.4); rolled back below on failure
    try {
      await apiFetch(`/api/gifts/${token}/claim`, { method: "POST", body: JSON.stringify({ contact }) });
      toast("Gift claimed. You will hear as your tree grows.", "success");
    } catch (err) {
      setDone(claimed);
      toast(err instanceof Error ? err.message : "Claim failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <p className="text-sm font-semibold inline-flex items-center gap-1.5" role="status">
        <BadgeCheck size={15} aria-hidden />
        Gift claimed. Thank you!
      </p>
    );
  return (
    <form onSubmit={submit} className="flex gap-2 mt-2">
      <input
        aria-label="Your email or phone"
        required
        placeholder="Your email or phone"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className="flex-1"
      />
      <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5">
        {busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <GiftIcon size={15} aria-hidden />}
        {busy ? "Claiming…" : "Claim"}
      </button>
    </form>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={() => window.print()}>
      <Printer size={14} aria-hidden />
      {label} (print/PDF)
    </button>
  );
}
