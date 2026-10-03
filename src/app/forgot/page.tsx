"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, MailCheck, Send } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Request failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={submit} className="gs-card p-6 w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-bold inline-flex items-center gap-2">
          <KeyRound size={19} aria-hidden />
          Reset password
        </h1>
        {sent ? (
          <p className="text-sm mt-2 inline-flex items-start gap-1.5">
            <MailCheck size={15} aria-hidden className="mt-0.5 shrink-0" />
            If that email is registered, a reset link is on its way (check the server log in dev mode).
          </p>
        ) : (
          <>
            <label className="block text-sm font-medium mt-3">
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full !rounded-2xl" />
            </label>
            <button type="submit" disabled={busy} className="mt-4 w-full !rounded-2xl inline-flex items-center justify-center gap-1.5">{busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Send size={15} aria-hidden />} {busy ? "Sending…" : "Send reset link"}</button>
          </>
        )}
        <p className="text-sm mt-3 text-center text-[var(--gs-muted)]">
          No account yet? Ask your organization admin for an invite, or{" "}
          <Link href="/signup" className="font-semibold text-[var(--gs-ink)]">
            sign up your organization
          </Link>
          .
        </p>
      </form>
    </main>
  );
}
