import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { saplings, species } from "@/db/schema";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive } from "@/lib/tenant";
import { parseCsv } from "@/lib/csv";
import { and, count, eq, isNull, or } from "drizzle-orm";

// GET /api/species, global catalog + caller's org additions, each with a
// live sapling count (scoped to the org unless super-admin global view).
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("species.read");
  const orgId = me.session.isSuperAdmin ? (req.nextUrl.searchParams.get("orgId") ?? null) : me.session.orgId;
  const withDeleted =
    req.nextUrl.searchParams.get("withDeleted") === "true" && hasPermission(me.permissions, "species.manage");
  const alive = withDeleted ? undefined : scopeAlive(species.deletedAt);
  const where = orgId
    ? alive
      ? and(alive, or(isNull(species.orgId), eq(species.orgId, orgId))!)
      : or(isNull(species.orgId), eq(species.orgId, orgId))!
    : alive;
  const db = getDb();
  const rows = await db.query.species.findMany({ where, orderBy: (s, { asc }) => [asc(s.commonName)], limit: 500 });
  const treeScope =
    orgId && orgId !== "__global__"
      ? and(eq(saplings.orgId, orgId), scopeAlive(saplings.deletedAt))
      : scopeAlive(saplings.deletedAt);
  const totals = await db
    .select({ speciesId: saplings.speciesId, n: count() })
    .from(saplings)
    .where(treeScope)
    .groupBy(saplings.speciesId);
  const bySpecies = new Map(totals.map((t) => [t.speciesId, Number(t.n)]));
  return NextResponse.json({
    species: rows.map((r) => ({ ...r, saplingCount: bySpecies.get(r.id) ?? 0 })),
  });
});

// POST /api/species, org-specific addition (species.manage). Super admin
// posts with ?orgId= absent to add to the global catalog.
const CreateBody = z.object({
  commonName: z.string().min(2).max(120),
  scientificName: z.string().max(160).optional(),
  category: z.enum(["native", "exotic", "fruit", "medicinal", "timber", "other"]).default("native"),
  co2KgPerYear: z.number().min(0).max(1000).default(0),
  imageUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  global: z.boolean().optional(), // super admin only
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("species.manage");
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("commonName is required.");
  let orgId: string | null = orgScope(me, {});
  if (parsed.data.global) {
    if (!me.session.isSuperAdmin) throw badRequest("Only super admins can edit the global catalog.");
    orgId = null;
  }
  const [row] = await getDb()
    .insert(species)
    .values({ ...parsed.data, orgId, scientificName: parsed.data.scientificName ?? null, imageUrl: parsed.data.imageUrl ?? null })
    .returning();
  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "species.create",
    entityType: "species",
    entityId: row.id,
    after: { commonName: row.commonName },
  });
  return NextResponse.json({ species: row }, { status: 201 });
});

// POST /api/species/import, CSV bulk import (species.manage). Columns:
// common_name,scientific_name,category,co2_kg_per_year
export async function PUT(req: NextRequest) {
  return api(async () => {
    const me = await requireUser("species.manage");
    const orgId = orgScope(me, {});
    const text = await req.text();
    const grid = parseCsv(text);
    if (grid.length < 2) throw badRequest("CSV needs a header row and at least one data row.");
    const header = grid[0].map((h) => h.trim().toLowerCase());
    const idx = (n: string) => header.indexOf(n);
    if (idx("common_name") < 0) throw badRequest("CSV must include a common_name column.");
    const validCats = ["native", "exotic", "fruit", "medicinal", "timber", "other"];
    const values = grid.slice(1, 501).map((r) => ({
      orgId,
      commonName: r[idx("common_name")]?.trim() || "Unnamed",
      scientificName: (idx("scientific_name") >= 0 ? r[idx("scientific_name")] : "") || null,
      category: validCats.includes(r[idx("category")] ?? "") ? r[idx("category")] : "native",
      co2KgPerYear: Number(r[idx("co2_kg_per_year")] ?? 0) || 0,
    }));
    await getDb().insert(species).values(values);
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "species.import",
      entityType: "species",
      entityId: orgId,
      after: { count: values.length },
    });
    return NextResponse.json({ imported: values.length });
  })(req, { params: Promise.resolve({}) });
}
