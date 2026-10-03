import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, saplings, species, saplingUpdates, type SaplingStatus } from "@/db/schema";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { newPublicId, qrSvg, saplingUrl } from "@/lib/qr";
import { and, desc, eq, ilike } from "drizzle-orm";

// GET /api/saplings?projectId=&status=&q=&limit=&offset=
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("sapling.read");
  const orgId = orgScope(me, {});
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const limit = Math.min(Number(sp.get("limit") ?? 50), 200);
  const offset = Number(sp.get("offset") ?? 0);
  const withDeleted = sp.get("withDeleted") === "true" && hasPermission(me.permissions, "sapling.delete");
  const filters = withDeleted ? [eq(saplings.orgId, orgId)] : [scopeOrg(saplings.orgId, orgId, saplings.deletedAt)];
  if (projectId) filters.push(eq(saplings.projectId, projectId));
  if (status) filters.push(eq(saplings.status, status as SaplingStatus));
  if (q) filters.push(ilike(saplings.nanoid, `%${q}%`));

  const rows = await getDb().query.saplings.findMany({
    where: and(...filters),
    orderBy: desc(saplings.createdAt),
    limit,
    offset,
    with: { species: true, project: true },
  });
  return NextResponse.json({ saplings: rows });
});

// POST /api/saplings, single create (sapling.create), QR generated server-side.
const CreateBody = z.object({
  projectId: z.string().uuid(),
  speciesId: z.string().uuid().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  gpsAccuracyM: z.number().min(0).max(100000).nullable().optional(),
  plantedAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("sapling.create");
  const orgId = orgScope(me, {});
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("projectId is required.");
  const db = getDb();
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, parsed.data.projectId), scopeOrg(projects.orgId, orgId, projects.deletedAt)),
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (parsed.data.speciesId) {
    const s = await db.query.species.findFirst({
      where: and(eq(species.id, parsed.data.speciesId), scopeAlive(species.deletedAt)),
    });
    if (!s || (s.orgId !== null && s.orgId !== orgId)) throw badRequest("Unknown species.");
  }
  const code = newPublicId();
  let plantedAt: Date | null = null;
  if (parsed.data.plantedAt) {
    plantedAt = new Date(parsed.data.plantedAt);
    if (Number.isNaN(plantedAt.getTime())) throw badRequest("plantedAt is not a valid date.");
    if (plantedAt.getTime() > Date.now()) throw badRequest("Plantation date cannot be in the future.");
  }
  const [row] = await db
    .insert(saplings)
    .values({
      orgId,
      projectId: project.id,
      speciesId: parsed.data.speciesId ?? null,
      nanoid: code,
      qrSvg: await qrSvg(saplingUrl(code)),
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      gpsAccuracyM: parsed.data.gpsAccuracyM ?? null,
      status: plantedAt ? "planted" : "registered",
      plantedAt,
      plantedBy: plantedAt ? me.session.userId : null,
      metadata: parsed.data.metadata ?? {},
    })
    .returning();
  if (plantedAt) {
    await db.insert(saplingUpdates).values({
      orgId,
      saplingId: row.id,
      status: "planted",
      recordedBy: me.session.userId,
      recordedAt: plantedAt,
    });
  }
  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "sapling.create",
    entityType: "sapling",
    entityId: row.id,
    after: { nanoid: code, ...(plantedAt ? { plantedAt: plantedAt.toISOString() } : {}) },
  });
  return NextResponse.json({ sapling: { ...row, url: saplingUrl(code) } }, { status: 201 });
});
