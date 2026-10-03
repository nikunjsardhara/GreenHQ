"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Bell, CheckCheck, Inbox, Leaf, Loader2, Map as MapIcon, Settings as SettingsIcon, User } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { InstallButton } from "@/components/pwa";
import { FormattedDateTime } from "@/components/formatted-date";
import { LogoutButton } from "@/components/logout-button";
import { MenuLink, PageHeader } from "@/components/ui";

interface Me {
  name: string;
  email: string;
  roleName: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
}

interface Note {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    apiFetch<{ user: Me }>("/api/auth/me").then((r) => setMe(r.user)).catch(() => router.push("/login"));
    apiFetch<{ notifications: Note[] }>("/api/notifications").then((r) => setNotes(r.notifications)).catch(() => {});
  }, [router]);

  const markAllRead = async () => {
    const ids = notes.filter((n) => !n.readAt).map((n) => n.id);
    if (!ids.length || markingRead) return;
    setMarkingRead(true);
    try {
      await apiFetch("/api/notifications", { method: "PATCH", body: JSON.stringify({ ids }) });
      setNotes((ns) => ns.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      toast("Notifications marked read.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Profile"
        actions={<InstallButton />}
      />
      <nav aria-label="Profile sections" className="gs-card px-5 py-2 mb-5">
        <ul className="divide-y divide-[var(--gs-line)]">
          {(
            [
              ["Activity", "/activity", Activity],
              ["Org map", "/map", MapIcon],
              ["Species catalog", "/species", Leaf],
              ["Settings", "/settings", SettingsIcon],
            ] as const
          ).map(([label, href, Icon]) => (
            <li key={href}>
              <MenuLink href={href}>
                <span className="inline-flex items-center gap-2.5">
                  <Icon size={16} aria-hidden className="text-[var(--gs-muted)]" />
                  {label}
                </span>
              </MenuLink>
            </li>
          ))}
        </ul>
      </nav>
      {me && (
        <section className="gs-card p-5">
          <p className="font-bold text-lg text-[var(--gs-ink)] inline-flex items-center gap-2">
            <User size={18} aria-hidden className="text-[var(--gs-muted)]" />
            {me.name}
          </p>
          <p className="text-sm text-[var(--gs-muted)] mt-1">{me.email} · {me.isSuperAdmin ? "Super Admin" : (me.roleName ?? "No role")}</p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </section>
      )}
      <div className="flex items-center justify-between mt-7 mb-3">
        <h2 className="text-xl font-bold text-[var(--gs-ink)] inline-flex items-center gap-2">
          <Bell size={18} aria-hidden />
          Notifications
        </h2>
        <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={markingRead} onClick={markAllRead}>
          {markingRead ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <CheckCheck size={14} aria-hidden />}
          {markingRead ? "Marking…" : "Mark all read"}
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {notes.map((n) => (
          <li key={n.id} className="gs-card p-4 text-sm" style={{ opacity: n.readAt ? 0.65 : 1 }}>
            <span className="font-mono text-xs font-bold text-[var(--gs-coral)]">{n.type}</span>
            <span className="block text-xs text-[var(--gs-muted)] mt-1"><FormattedDateTime value={n.createdAt} /></span>
          </li>
        ))}
      </ul>
      {notes.length === 0 && (
        <p className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
          <Inbox size={15} aria-hidden />
          No notifications.
        </p>
      )}
    </div>
  );
}
