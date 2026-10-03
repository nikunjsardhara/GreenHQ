import { getDb } from "@/db";
import { Inbox, ScrollText, Trophy } from "lucide-react";
import { auditLog, saplingUpdates, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { orgScope } from "@/lib/server-auth";
import { PageHeader } from "@/components/ui";
import { formatDateTime, formatDay } from "@/lib/dates";
import { RestoreButton } from "@/components/restore-button";
import { and, count, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Module-scope clock read: this is a per-request server component, so "now"
// is request time, not render time.
function recentCutoff(): Date {
  return new Date(Date.now() - 14 * 86400000);
}

// Activity view, PRD §8 calendar-strip style: 14-day planting/activity strip
// + audit trail for admins.
export default async function ActivityPage() {
  const u = (await getCurrentUser())!;
  const orgId = u.session.isSuperAdmin ? null : orgScope(u, {});
  const db = getDb();
  const since = recentCutoff();

  const days: { date: Date; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: d, count: 0 });
  }
  const updates = await db.query.saplingUpdates.findMany({
    where: orgId
      ? and(eq(saplingUpdates.orgId, orgId), gte(saplingUpdates.recordedAt, since))
      : gte(saplingUpdates.recordedAt, since),
    columns: { recordedAt: true },
    limit: 5000,
  });
  for (const x of updates) {
    const key = new Date(x.recordedAt).toDateString();
    const day = days.find((d) => d.date.toDateString() === key);
    if (day) day.count++;
  }

  const canAudit = u.permissions.includes("*") || u.permissions.includes("audit.read");
  const trail = canAudit
    ? await db.query.auditLog.findMany({
        where: orgId ? eq(auditLog.orgId, orgId) : undefined,
        orderBy: desc(auditLog.createdAt),
        limit: 50,
      })
    : [];

  const max = Math.max(1, ...days.map((d) => d.count));

  // Per-volunteer contribution stats (PRD §8 progress cards).
  const byVolunteer = await db
    .select({ userId: saplingUpdates.recordedBy, n: count() })
    .from(saplingUpdates)
    .where(
      orgId
        ? and(eq(saplingUpdates.orgId, orgId), isNotNull(saplingUpdates.recordedBy))
        : isNotNull(saplingUpdates.recordedBy),
    )
    .groupBy(saplingUpdates.recordedBy)
    .orderBy(desc(count()))
    .limit(5);
  const volunteerIds = byVolunteer.map((v) => v.userId).filter(Boolean) as string[];
  const volunteerNames = new Map(
    (volunteerIds.length
      ? await db.query.users.findMany({ where: inArray(users.id, volunteerIds), columns: { id: true, name: true } })
      : []
    ).map((x) => [x.id, x.name]),
  );
  const topVolunteers = byVolunteer.map((v) => ({
    name: volunteerNames.get(v.userId!) ?? "Unknown",
    count: Number(v.n),
  }));
  const topMax = Math.max(1, ...topVolunteers.map((v) => v.count), 1);

  return (
    <div>
      <PageHeader title="Activity" subtitle="Last 14 days" />
      <div className="gs-card p-5 flex items-end gap-2 h-40" role="img" aria-label={`Field activity, last 14 days, max ${max} updates in a day`}>
        {days.map((d) => (
          <div key={d.date.toISOString()} className="flex-1 flex flex-col items-center gap-1.5" title={`${formatDay(d.date)}: ${d.count} updates`}>
            <span className="text-[0.65rem] font-semibold text-[var(--gs-ink)]">{d.count || ""}</span>
            <div className="w-full rounded-t-xl bg-[var(--gs-coral)]" style={{ height: `${Math.max(6, (d.count / max) * 80)}px`, opacity: d.count ? 1 : 0.2 }} />
            <span className="text-[0.65rem] text-[var(--gs-muted)]">{d.date.getDate()}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mt-7 mb-3 text-[var(--gs-ink)] inline-flex items-center gap-2">
        <Trophy size={18} aria-hidden />
        Top contributors
      </h2>
      <ul className="flex flex-col gap-3">
        {topVolunteers.map((v) => (
          <li key={v.name} className="gs-card p-4">
            <span className="block text-sm font-semibold text-[var(--gs-ink)]">{v.name} · {v.count} updates</span>
            <span className="block h-2.5 rounded-full bg-[var(--gs-line)] mt-2 overflow-hidden" aria-hidden>
              <span className="block h-full bg-[var(--gs-mint)]" style={{ width: `${Math.round((v.count / topMax) * 100)}%` }} />
            </span>
          </li>
        ))}
        {topVolunteers.length === 0 && (
          <li className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
            <Inbox size={15} aria-hidden />
            No field updates yet.
          </li>
        )}
      </ul>

      {canAudit && (
        <>
          <h2 className="text-xl font-bold mt-7 mb-3 text-[var(--gs-ink)] inline-flex items-center gap-2">
            <ScrollText size={18} aria-hidden />
            Audit trail
          </h2>
          <ul className="flex flex-col gap-3">
            {trail.map((e) => {
              const restorable =
                (e.action === "project.delete" || e.action === "sapling.delete" || e.action === "species.delete") &&
                (u.permissions.includes("*") ||
                  u.permissions.includes(e.action === "species.delete" ? "species.manage" : e.action === "sapling.delete" ? "sapling.delete" : "project.delete"));
              const kind = e.action === "species.delete" ? "species" : e.action === "sapling.delete" ? "sapling" : "project";
              return (
                <li key={e.id} className="gs-card p-4 text-sm flex items-center gap-3">
                  <span className="flex-1">
                    <span className="font-mono text-xs font-bold text-[var(--gs-coral)]">{e.action}</span>{" "}
                    <span className="text-[var(--gs-muted)]">{e.entityType} {e.entityId.slice(0, 8)}…</span>
                    <span className="block text-xs text-[var(--gs-muted)] mt-1">{formatDateTime(e.createdAt)}</span>
                  </span>
                  {restorable && <RestoreButton kind={kind as "project" | "sapling" | "species"} id={e.entityId} />}
                </li>
              );
            })}
          </ul>
          {trail.length === 0 && (
            <p className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
              <Inbox size={15} aria-hidden />
              No audit entries yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
