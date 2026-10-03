"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";
import { STRINGS } from "@/i18n/en";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/auth/accept-invite", { method: "POST", body: JSON.stringify({ token, name, password }) });
      toast("Welcome aboard. Please sign in.", "success");
      router.push("/login");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invite failed.", "error");
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
        <h1 className="text-xl font-bold">{STRINGS.auth.acceptInvite}</h1>
        <p className="text-sm text-[var(--gs-muted)]">Set your name and password to join your organization.</p>
        <label className="block text-sm font-medium mt-3">
          Name
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full !rounded-2xl" autoComplete="name" />
        </label>
        <label className="block text-sm font-medium mt-3">
          Password (8+ characters)
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full !rounded-2xl" autoComplete="new-password" />
        </label>
        <button type="submit" disabled={busy} className="mt-4 w-full !rounded-2xl inline-flex items-center justify-center gap-1.5">{busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <UserPlus size={15} aria-hidden />}{busy ? "Joining…" : STRINGS.auth.acceptInvite}</button>
      </form>
    </main>
  );
}
