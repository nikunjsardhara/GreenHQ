"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Save, Send, ShieldPlus, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { OatTabs } from "@/components/oat";
import { OrgLogo } from "@/components/org-logo";
import { PageHeader } from "@/components/ui";
import { PERMISSIONS } from "@/lib/permissions";

interface Org { id: string; name: string; logoUrl: string | null; brandColor: string; contactEmail: string | null; address: string | null }
interface Role { id: string; name: string; permissions: string[] }
interface OrgUser { id: string; email: string; name: string; status: string; roleId: string | null; role: Role | null }

// Org settings, PRD §5.1 profile/branding + §4 custom roles + user management.
export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["project.read", "sapling.read"]);
  const [orgBusy, setOrgBusy] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const me = await apiFetch<{ user: { orgId: string } }>("/api/auth/me");
      if (!me.user?.orgId) return;
      const o = await apiFetch<{ organizations: Org[] }>("/api/organizations");
      setOrg(o.organizations[0] ?? null);
    } catch { /* read-only viewers land here without perms */ }
    try {
      const r = await apiFetch<{ roles: Role[] }>("/api/roles");
      setRoles(r.roles);
    } catch { /* no role.manage */ }
    try {
      const r = await apiFetch<{ users: OrgUser[] }>("/api/users");
      setUsers(r.users);
    } catch { /* no user.manage */ }
  };
  useEffect(() => {
    // Fetch-on-mount for the settings workspace (no subscriptions involved).
    load();
  }, []);

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || orgBusy) return;
    setOrgBusy(true);
    try {
      const res = await apiFetch<{ organization: Org }>(`/api/organizations/${org.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: org.name, logoUrl: org.logoUrl, brandColor: org.brandColor, contactEmail: org.contactEmail, address: org.address }),
      });
      setOrg(res.organization);
      toast("Organization saved.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed.", "error");
    } finally {
      setOrgBusy(false);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      const res = await apiFetch<{ inviteLink: string }>("/api/auth/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, name: inviteName, roleId: inviteRole || null }),
      });
      setInviteLink(res.inviteLink);
      setInviteEmail("");
      setInviteName("");
      load();
      toast("Invite created.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Invite failed.", "error");
    } finally {
      setInviteBusy(false);
    }
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleBusy) return;
    setRoleBusy(true);
    try {
      await apiFetch("/api/roles", { method: "POST", body: JSON.stringify({ name: newRole, permissions: newPerms }) });
      setNewRole("");
      load();
      toast("Role created.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed.", "error");
    } finally {
      setRoleBusy(false);
    }
  };

  const togglePerm = (p: string) =>
    setNewPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const resetPassword = async (userId: string, email: string) => {
    if (!window.confirm(`Send a password-reset link to ${email}?`)) return;
    setResettingId(userId);
    try {
      const res = await apiFetch<{ resetLink: string }>(`/api/users/${userId}/reset-password`, { method: "POST" });
      toast(`Reset link created (also emailed): ${res.resetLink}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Reset failed.", "error");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />
      <OatTabs
        labelledBy="Settings sections"
        tabs={[
          {
            id: "org", label: "Organization",
            content: org ? (
              <form onSubmit={saveOrg} className="gs-card p-5 flex flex-col gap-3">
                {org.logoUrl && (
                  <div className="flex items-center gap-3">
                    <OrgLogo name={org.name} logoUrl={org.logoUrl} size={44} rounded="rounded-2xl" />
                    <span className="text-sm text-[var(--gs-muted)]">Logo preview</span>
                  </div>
                )}
                <label className="text-sm font-medium text-[var(--gs-ink)]">Name<input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} className="mt-2 w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" /></label>
                <label className="text-sm font-medium text-[var(--gs-ink)]">Logo image URL (shown wherever the organization name appears)<input type="url" placeholder="https://…" value={org.logoUrl ?? ""} onChange={(e) => setOrg({ ...org, logoUrl: e.target.value || null })} className="mt-2 w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" /></label>
                <label className="text-sm font-medium text-[var(--gs-ink)]">Brand color (used on public gift pages)<input type="color" value={org.brandColor} onChange={(e) => setOrg({ ...org, brandColor: e.target.value })} className="mt-2" /></label>
                <label className="text-sm font-medium text-[var(--gs-ink)]">Contact email<input type="email" value={org.contactEmail ?? ""} onChange={(e) => setOrg({ ...org, contactEmail: e.target.value || null })} className="mt-2 w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" /></label>
                <label className="text-sm font-medium text-[var(--gs-ink)]">Address<input value={org.address ?? ""} onChange={(e) => setOrg({ ...org, address: e.target.value || null })} className="mt-2 w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" /></label>
                <button type="submit" disabled={orgBusy} className="mt-2 !bg-[var(--gs-ink)] !text-white !py-3 !rounded-2xl inline-flex items-center justify-center gap-1.5">{orgBusy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Save size={15} aria-hidden />} {orgBusy ? "Saving…" : "Save"}</button>
              </form>
            ) : <p className="text-sm text-[var(--gs-muted)]">No organization access.</p>,
          },
          {
            id: "roles", label: "Roles",
            content: (
              <div>
                <ul className="flex flex-col gap-3">
                  {roles.map((r) => (
                    <li key={r.id} className="gs-card p-4 text-sm">
                      <span className="font-semibold text-[var(--gs-ink)]">{r.name}</span>
                      <span className="block text-xs text-[var(--gs-muted)] mt-1">{r.permissions.join(", ") || "no permissions"}</span>
                    </li>
                  ))}
                </ul>
                <form onSubmit={createRole} className="gs-card p-5 mt-4">
                  <h3 className="font-bold text-sm mb-3 text-[var(--gs-ink)] inline-flex items-center gap-1.5"><ShieldPlus size={15} aria-hidden /> New custom role</h3>
                  <input aria-label="Role name" required placeholder="Role name" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full mb-3 !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
                  <fieldset>
                    <legend className="text-sm text-[var(--gs-ink)]">Permissions</legend>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PERMISSIONS.map((p) => (
                        <label key={p} className="text-xs flex gap-1.5 items-center">
                          <input type="checkbox" checked={newPerms.includes(p)} onChange={() => togglePerm(p)} /> {p}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button type="submit" disabled={roleBusy} className="mt-4 !bg-[var(--gs-ink)] !text-white !py-3 !rounded-2xl inline-flex items-center justify-center gap-1.5">{roleBusy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <ShieldPlus size={15} aria-hidden />} {roleBusy ? "Creating…" : "Create role"}</button>
                </form>
              </div>
            ),
          },
          {
            id: "users", label: "Users",
            content: (
              <div>
                <ul className="flex flex-col gap-3">
                  {users.map((x) => (
                    <li key={x.id} className="gs-card p-4 text-sm flex justify-between gap-3 items-center">
                      <span><span className="font-semibold text-[var(--gs-ink)]">{x.name}</span> <span className="text-[var(--gs-muted)]">{x.email} · {x.role?.name ?? "no role"} · {x.status.charAt(0).toUpperCase() + x.status.slice(1)}</span></span>
                      <button type="button" className="gs-chip shrink-0 inline-flex items-center gap-1.5" disabled={resettingId === x.id} onClick={() => resetPassword(x.id, x.email)}>{resettingId === x.id ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <KeyRound size={14} aria-hidden />} {resettingId === x.id ? "Sending…" : "Reset password"}</button>
                    </li>
                  ))}
                </ul>
                <form onSubmit={invite} className="gs-card p-5 mt-4 flex flex-col gap-3">
                  <h3 className="font-bold text-sm text-[var(--gs-ink)] inline-flex items-center gap-1.5"><UserPlus size={15} aria-hidden /> Invite user</h3>
                  <input aria-label="Invitee name" required placeholder="Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
                  <input aria-label="Invitee email" required type="email" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
                  <select aria-label="Invite role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none">
                    <option value="">No role yet</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button type="submit" disabled={inviteBusy} className="!bg-[var(--gs-ink)] !text-white !py-3 !rounded-2xl inline-flex items-center justify-center gap-1.5">{inviteBusy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Send size={15} aria-hidden />} {inviteBusy ? "Sending…" : "Send invite"}</button>
                  {inviteLink && <p className="text-xs break-all">Invite link (also emailed): <a href={inviteLink}>{inviteLink}</a></p>}
                </form>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
