"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { KeyRound, Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";

export default function ResetPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/auth/forgot", { method: "PUT", body: JSON.stringify({ token, password }) });
      toast("Password updated. Please sign in.", "success");
      router.push("/login");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reset failed.", "error");
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
          Set a new password
        </h1>
        <label className="block text-sm font-medium mt-3">
          New password (8+ characters)
          <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full !rounded-2xl" />
        </label>
        <button type="submit" disabled={busy} className="mt-4 w-full !rounded-2xl inline-flex items-center justify-center gap-1.5">{busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Save size={15} aria-hidden />} {busy ? "Updating…" : "Update password"}</button>
      </form>
    </main>
  );
}
