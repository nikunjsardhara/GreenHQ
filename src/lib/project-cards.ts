// Card data for project grids: counts + zone names + contributor names.
// Single source for the dashboard and /projects (PRD §8 bento cards with
// team avatar-stacks).
import { desc, inArray } from "drizzle-orm";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, saplingUpdates, saplings, users, zones } from "@/db/schema";
import { scopeAlive, scopeOrg } from "./tenant";

export interface ProjectCard {
  id: string;
  name: string;
  description: string | null;
  status: string;
  targetCount: number;
  saplingCount: number;
  team: string[];
  zoneNames: string[];
  startDate: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export async function getProjectCards(orgId: string, includeDeleted = false): Promise<ProjectCard[]> {
  const db = getDb();
  const rows = await db.query.projects.findMany({
    where: includeDeleted ? eq(projects.orgId, orgId) : scopeOrg(projects.orgId, orgId, projects.deletedAt),
    orderBy: desc(projects.updatedAt),
    limit: 100,
  });
  if (!rows.length) return [];

  const totals = await db
    .select({ projectId: saplings.projectId, n: count() })
    .from(saplings)
    .where(and(eq(saplings.orgId, orgId), scopeAlive(saplings.deletedAt)))
    .groupBy(saplings.projectId);
  const byProject = new Map(totals.map((t) => [t.projectId, Number(t.n)]));

  const zoneRows = await db.query.zones.findMany({
    where: scopeOrg(zones.orgId, orgId, zones.deletedAt),
    columns: { projectId: true, name: true },
    limit: 500,
  });
  const zonesByProject = new Map<string, string[]>();
  for (const z of zoneRows) {
    const list = zonesByProject.get(z.projectId) ?? [];
    if (!list.includes(z.name)) list.push(z.name);
    zonesByProject.set(z.projectId, list);
  }

  // Contributors: recent field updates → user names → project mapping.
  const recent = await db.query.saplingUpdates.findMany({
    where: and(eq(saplingUpdates.orgId, orgId)),
    columns: { saplingId: true, recordedBy: true },
    orderBy: desc(saplingUpdates.recordedAt),
    limit: 300,
  });
  const saplingIds = [...new Set(recent.map((r) => r.saplingId))];
  const saps = saplingIds.length
    ? await db.query.saplings.findMany({
        where: inArray(saplings.id, saplingIds),
        columns: { id: true, projectId: true },
      })
    : [];
  const projectOf = new Map(saps.map((s) => [s.id, s.projectId]));
  const userIds = [...new Set(recent.map((r) => r.recordedBy).filter(Boolean))] as string[];
  const people = userIds.length
    ? await db.query.users.findMany({ where: inArray(users.id, userIds), columns: { id: true, name: true } })
    : [];
  const names = new Map(people.map((p) => [p.id, p.name]));
  const teamByProject = new Map<string, string[]>();
  for (const r of recent) {
    const pid = projectOf.get(r.saplingId);
    const nm = r.recordedBy ? names.get(r.recordedBy) : undefined;
    if (!pid || !nm) continue;
    const list = teamByProject.get(pid) ?? [];
    if (!list.includes(nm) && list.length < 5) list.push(nm);
    teamByProject.set(pid, list);
  }

  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    targetCount: p.targetCount,
    saplingCount: byProject.get(p.id) ?? 0,
    team: teamByProject.get(p.id) ?? [],
    zoneNames: zonesByProject.get(p.id) ?? [],
    startDate: p.startDate,
    createdAt: p.createdAt,
    deletedAt: p.deletedAt,
  }));
}
