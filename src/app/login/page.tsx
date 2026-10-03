"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, KeyRound, Loader2, LogIn, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { Logo } from "@/components/logo";
import { STRINGS } from "@/i18n/en";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

// Demo quick-login: one tap fills credentials and signs in as that role in
// the "Grow Native Green Forum" demo org (seeded via `bun run seed`).
const DEMO_PASSWORD = "password123";
const DEMO_LOGINS = [
  { label: "Organization Admin", short: "Admin", email: "admin@grow-native-green.example" },
  { label: "Coordinator", short: "Coordinator", email: "coordinator@grow-native-green.example" },
  { label: "Field Volunteer", short: "Volunteer", email: "volunteer@grow-native-green.example" },
  { label: "Viewer", short: "Viewer", email: "viewer@grow-native-green.example" },
];

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Bounced here without a session (e.g. it expired, or the browser dropped
  // the cookie). Say so instead of silently re-showing the form.
  const expired = search.get("expired") === "1";

  const doLogin = async (em: string, pw: string) => {
    await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email: em, password: pw }) });
    // The credentials were right, but the session cookie may still not have
    // stuck (e.g. the browser blocked it), which used to bounce silently
    // back to this page with no error. Verify before navigating.
    const me = await apiFetch<{ user: { id: string } | null }>("/api/auth/me");
    if (!me.user) {
      throw new Error(
        "Signed in, but the session didn't stick. Your browser may be blocking cookies for this site. Allow cookies and try again.",
      );
    }
    toast("Signed in.", "success");
    router.push("/");
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await doLogin(email, password);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sign-in failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = async (demo: { email: string }) => {
    if (busy) return;
    setEmail(demo.email);
    setPassword(DEMO_PASSWORD);
    setBusy(true);
    try {
      await doLogin(demo.email, DEMO_PASSWORD);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sign-in failed.", "error");
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
        <div className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--gs-line)" }}>
          <p className="text-xs font-semibold text-center text-[var(--gs-muted)]">
            {STRINGS.auth.demoRoles} (one tap sign-in)
          </p>
          <div className="flex gap-1.5 mt-1.5 overflow-x-auto">
            {DEMO_LOGINS.map((d) => (
              <button
                key={d.email}
                type="button"
                disabled={busy}
                onClick={() => quickLogin(d)}
                title={`Sign in as ${d.label}`}
                className="gs-chip !py-1.5 !px-3 text-xs font-semibold whitespace-nowrap flex-1 inline-flex items-center justify-center"
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm mb-4 rounded-2xl p-3 inline-flex items-start gap-1.5" style={{ background: "var(--gs-mint-light)", border: "1px solid var(--gs-line)" }}>
          <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            Volunteer or organization member? Ask your organization admin to invite you, then set your password from
            the invite email. Forgot it later? Use <Link href="/forgot" className="font-semibold">Forgot password</Link> below.
          </span>
        </p>
        {expired && (
          <p role="status" className="text-sm mb-4 rounded-2xl p-3 inline-flex items-start gap-1.5" style={{ background: "var(--gs-yellow-light)", border: "1px solid var(--gs-yellow)" }}>
            <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
            You were signed out (or the session didn&apos;t stick). Please sign in again.
          </p>
        )}
        <label className="block text-sm font-medium">
          {STRINGS.auth.email}
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full !rounded-2xl" />
        </label>
        <label className="block text-sm font-medium mt-3">
          {STRINGS.auth.password}
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full !rounded-2xl" />
        </label>
        <button type="submit" disabled={busy} className="mt-4 w-full !rounded-2xl inline-flex items-center justify-center gap-1.5">
          {busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <LogIn size={15} aria-hidden />}
          {busy ? STRINGS.common.loading : STRINGS.auth.signIn}
        </button>
        <p className="text-sm mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound size={13} aria-hidden className="text-[var(--gs-muted)]" />
            <Link href="/forgot">Forgot password?</Link>
          </span>
          <Link href="/" className="inline-flex items-center gap-1">
            What is GreenHQ? <ArrowRight size={13} aria-hidden />
          </Link>
        </p>
        <p className="text-sm mt-3 pt-3 text-center text-[var(--gs-muted)]" style={{ borderTop: "1px solid var(--gs-line)" }}>
          {STRINGS.auth.newHere}{" "}
          <Link href="/signup" className="font-semibold text-[var(--gs-ink)]">
            {STRINGS.auth.signUp} your organization
          </Link>
        </p>
      </form>
    </main>
  );
}
