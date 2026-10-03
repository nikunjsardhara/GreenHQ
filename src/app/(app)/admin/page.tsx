"use client";

import { useEffect, useState } from "react";
import { Ban, Loader2, Play, Plus } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/ui";
import { OrgLogo } from "@/components/org-logo";

interface Org { id: string; name: string; slug: string; status: string; logoUrl: string | null }

// Super Admin dashboard, PRD §4: all orgs, create/suspend, usage, cross-org view.
export default function AdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const load = () => apiFetch<{ organizations: Org[] }>("/api/organizations").then((r) => setOrgs(r.organizations)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const res = await apiFetch<{ inviteLink: string }>("/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name, slug, adminEmail, adminName }),
      });
      setInviteLink(res.inviteLink);
      setName("");
      setSlug("");
      setAdminEmail("");
      setAdminName("");
      load();
      toast("Organization created.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed.", "error");
    } finally {
      setCreating(false);
    }
  };

  const suspend = async (o: Org) => {
    const next = o.status === "active" ? "suspended" : "active";
    if (!window.confirm(`${next === "suspended" ? "Suspend" : "Reactivate"} ${o.name}?`)) return;
    setTogglingId(o.id);
    try {
      await apiFetch(`/api/organizations/${o.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      load();
      toast(`Organization ${next}.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Platform admin" subtitle={`${orgs.length} organizations`} />
      <ul className="flex flex-col gap-3">
        {orgs.map((o) => (
          <li key={o.id} className="gs-card p-4 flex items-center gap-4">
            <OrgLogo name={o.name} logoUrl={o.logoUrl} size={48} rounded="rounded-2xl" />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[var(--gs-ink)]">{o.name}</span>
              <span className="block text-xs text-[var(--gs-muted)] mt-1">{o.slug} · {o.status.charAt(0).toUpperCase() + o.status.slice(1)}</span>
            </span>
            <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={togglingId === o.id} onClick={() => suspend(o)}>
              {togglingId === o.id ? <Loader2 size={14} aria-hidden className="animate-spin" /> : o.status === "active" ? <Ban size={14} aria-hidden /> : <Play size={14} aria-hidden />}
              {togglingId === o.id ? "Working…" : o.status === "active" ? "Suspend" : "Reactivate"}
            </button>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mt-7 mb-3 text-[var(--gs-ink)] inline-flex items-center gap-2">
        <Plus size={18} aria-hidden />
        Create organization
      </h2>
      <form onSubmit={create} className="gs-card p-5 flex flex-col gap-3">
        <input aria-label="Organization name" required placeholder="Organization name" value={name} onChange={(e) => setName(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <input aria-label="Slug" required placeholder="slug-like-this" pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <input aria-label="First admin name" required placeholder="First admin name" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <input aria-label="First admin email" required type="email" placeholder="First admin email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <button type="submit" disabled={creating} className="!bg-[var(--gs-ink)] !text-white !py-3 !rounded-2xl inline-flex items-center justify-center gap-1.5">{creating ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Plus size={15} aria-hidden />} {creating ? "Creating…" : "Create org + invite admin"}</button>
        {inviteLink && <p className="text-xs break-all">Admin invite link: <a href={inviteLink}>{inviteLink}</a></p>}
      </form>
    </div>
  );
}
