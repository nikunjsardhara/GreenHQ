"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Sprout } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";
import { STRINGS } from "@/i18n/en";

export default function SignupPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ orgName, name, email, password }),
      });
      toast("Organization created. Welcome to GreenHQ!", "success");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Signup failed.", "error");
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
          <Building2 size={19} aria-hidden />
          {STRINGS.auth.signUp} your organization
        </h1>
        <p className="text-sm text-[var(--gs-muted)] mt-1 mb-4">
          Create your NGO workspace. You will be its first admin.
        </p>
        <label className="block text-sm font-medium">
          {STRINGS.auth.orgName}
          <input
            required
            minLength={2}
            maxLength={120}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
            autoComplete="organization"
            placeholder="Grow Native Green Forum"
          />
        </label>
        <label className="block text-sm font-medium mt-3">
          {STRINGS.auth.yourName}
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
            autoComplete="name"
          />
        </label>
        <label className="block text-sm font-medium mt-3">
          {STRINGS.auth.email}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium mt-3">
          {STRINGS.auth.password} (8+ characters)
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full !rounded-2xl inline-flex items-center justify-center gap-1.5"
        >
          {busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Sprout size={15} aria-hidden />}
          {busy ? STRINGS.common.loading : STRINGS.auth.createOrg}
        </button>
        <p className="text-sm mt-3 text-center text-[var(--gs-muted)]">
          {STRINGS.auth.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-[var(--gs-ink)]">
            {STRINGS.auth.signIn}
          </Link>
        </p>
      </form>
    </main>
  );
}
