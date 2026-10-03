import { getDb } from "@/db";
import { saplings, species } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { SaplingList } from "@/components/sapling-list";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SaplingsPage({ searchParams }: { searchParams: Promise<{ projectId?: string; status?: string }> }) {
  const sp = await searchParams;
  const u = (await getCurrentUser())!;
  const orgId = u.session.orgId!;
  const db = getDb();
  const filters = [scopeOrg(saplings.orgId, orgId, saplings.deletedAt)];
  if (sp.projectId) filters.push(eq(saplings.projectId, sp.projectId));

  const rows = await db.query.saplings.findMany({
    where: and(...filters),
    orderBy: desc(saplings.createdAt),
    limit: 500,
    with: {
      species: { columns: { id: true, commonName: true } },
      project: { columns: { id: true, name: true, startDate: true } },
    },
  });

  // Species facets with live sapling counts (scoped, alive only).
  const catalog = await db.query.species.findMany({
    where: and(
      scopeAlive(species.deletedAt),
      or(isNull(species.orgId), eq(species.orgId, orgId)),
    ),
    columns: { id: true, commonName: true },
  });
  const totals = await db
    .select({ speciesId: saplings.speciesId, n: count() })
    .from(saplings)
    .where(and(...filters))
    .groupBy(saplings.speciesId);
  const bySpecies = new Map(totals.map((t) => [t.speciesId, Number(t.n)]));
  const facets = catalog
    .map((c) => ({ id: c.id, name: c.commonName, count: bySpecies.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const unassigned = bySpecies.get(null) ?? 0;

  return (
    <div>
      <PageHeader title="Saplings" subtitle={`${rows.length} showing (max 500)`} />
      <SaplingList
        saplings={rows.map((r) => ({
          nanoid: r.nanoid,
          status: r.status,
          species: r.species ? { id: r.species.id, commonName: r.species.commonName } : null,
          project: r.project,
          plantedAt: r.plantedAt,
          createdAt: r.createdAt,
        }))}
        speciesFacets={facets}
        unassignedCount={unassigned}
        speciesOptions={catalog.map((c) => ({ id: c.id, commonName: c.commonName }))}
        canEdit={hasPermission(u.permissions, "sapling.update_status")}
      />
    </div>
  );
}
