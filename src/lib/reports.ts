// Shared impact-summary query, PRD §6.9. Used by both the API route and
// server-rendered dashboard pages (single source of truth).
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, saplings, species } from "@/db/schema";
import { scopeAlive, scopeOrg } from "./tenant";
import { geojsonAreaHa } from "./geo";

export async function getOrgSummary(orgId: string) {
  const db = getDb();
  const alive = and(eq(saplings.orgId, orgId), scopeAlive(saplings.deletedAt));
  const byStatus = await db
    .select({ status: saplings.status, n: count() })
    .from(saplings)
    .where(alive)
    .groupBy(saplings.status);
  const counts: Record<string, number> = {};
  for (const r of byStatus) counts[r.status] = Number(r.n);
  const plantedLike = (counts.planted ?? 0) + (counts.growing ?? 0) + (counts.mature ?? 0);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const trees = await db.query.saplings.findMany({
    where: alive,
    columns: { speciesId: true, status: true },
    limit: 100000,
  });
  const catalog = await db.query.species.findMany({
    where: scopeAlive(species.deletedAt),
    columns: { id: true, co2KgPerYear: true },
  });
  const factor = new Map(catalog.map((s) => [s.id, s.co2KgPerYear]));
  let co2KgPerYear = 0;
  for (const t of trees) {
    if (t.status === "lost" || t.status === "registered" || !t.speciesId) continue;
    co2KgPerYear += factor.get(t.speciesId) ?? 0;
  }

  const projectRows = await db.query.projects.findMany({
    where: scopeOrg(projects.orgId, orgId, projects.deletedAt),
    columns: { id: true, name: true, status: true, targetCount: true },
  });
  const projectZones = await db.query.projects.findMany({
    where: scopeOrg(projects.orgId, orgId, projects.deletedAt),
    columns: { id: true, zoneGeojson: true },
  });
  const areaCoveredHa =
    Math.round(projectZones.reduce((a, p) => a + geojsonAreaHa(p.zoneGeojson as { coordinates?: [number, number][][] } | null), 0) * 10) / 10;
  const perProject = await Promise.all(
    projectRows.map(async (p) => {
      const [{ n }] = await db
        .select({ n: count() })
        .from(saplings)
        .where(and(eq(saplings.projectId, p.id), scopeAlive(saplings.deletedAt)));
      return { ...p, saplingCount: Number(n) };
    }),
  );

  return {
    orgId,
    totals: {
      saplings: total,
      planted: plantedLike,
      co2KgPerYear: Math.round(co2KgPerYear * 10) / 10,
      areaCoveredHa,
      projects: projectRows.length,
    },
    byStatus: counts,
    projects: perProject,
  };
}
