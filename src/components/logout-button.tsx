"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/client";

// Profile-page sign out, rendered only on /profile, not in the global header.
export function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      type="button"
      onClick={logout}
      className="gs-chip no-print inline-flex items-center gap-1.5 shrink-0"
      style={{ background: "var(--gs-ink)", color: "#fff", borderColor: "var(--gs-ink)" }}
    >
      <LogOut size={14} aria-hidden />
      <span>Sign out</span>
    </button>
  );
}
