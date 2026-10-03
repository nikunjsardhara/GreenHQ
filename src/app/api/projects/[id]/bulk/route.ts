import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, saplings, species, organizations, saplingUpdates, usageMetrics } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { newPublicId, qrSvg, saplingUrl, scatterInPolygon } from "@/lib/qr";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

// POST /api/projects/[id]/bulk, PRD §5.4 bulk QR/sapling creation wizard backend.
// One transaction: N nanoids + N server-side QR codes. Non-blocking by design:
// QR SVGs are generated in small chunks and only short-codes travel back to
// the client (the printable sheet re-renders QRs client-side from the same
// payload, or fetches stored SVGs for print).
const Item = z.object({ speciesId: z.string().uuid().nullable(), quantity: z.number().int().min(1).max(2000) });
const Body = z.object({
  items: z.array(Item).min(1).max(20),
  location: z.union([
    z.object({ mode: z.literal("blank") }),
    z.object({ mode: z.literal("single"), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracyM: z.number().min(0).max(100000).optional() }),
    z.object({ mode: z.literal("zone-scatter") }),
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Optional plantation date (ISO datetime): the batch was already planted, 
  // rows are stored as Planted with a timeline entry instead of Registered.
  plantedAt: z.string().datetime().optional(),
});

const MAX_BATCH = 2000;

export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("sapling.bulk_create");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const db = getDb();

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("items[] and location strategy are required.");
    const total = parsed.data.items.reduce((n, i) => n + i.quantity, 0);
    if (total < 1 || total > MAX_BATCH) throw badRequest(`Batch must be 1-${MAX_BATCH} saplings.`);
    let plantedAt: Date | null = null;
    if (parsed.data.plantedAt) {
      plantedAt = new Date(parsed.data.plantedAt);
      if (Number.isNaN(plantedAt.getTime())) throw badRequest("plantedAt is not a valid date.");
      if (plantedAt.getTime() > Date.now()) throw badRequest("Plantation date cannot be in the future.");
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), scopeOrg(projects.orgId, orgId, projects.deletedAt)),
    });
    if (!project) throw notFound("Project not found.");

    // Validate species (global catalog or own org).
    for (const item of parsed.data.items) {
      if (!item.speciesId) continue;
      const sp = await db.query.species.findFirst({
        where: and(eq(species.id, item.speciesId), scopeAlive(species.deletedAt)),
      });
      if (!sp || (sp.orgId !== null && sp.orgId !== orgId)) throw badRequest("Unknown species in batch.");
    }

    // Resolve locations per strategy.
    const loc = parsed.data.location;
    let scattered: { lat: number; lng: number }[] = [];
    if (loc.mode === "zone-scatter") {
      const poly = project.zoneGeojson as { type?: string; coordinates?: [number, number][][] } | null;
      if (!poly?.coordinates?.length) throw badRequest("Project has no zone polygon to scatter within.");
      scattered = scatterInPolygon(poly, total);
      if (scattered.length < total)
        throw badRequest("Zone polygon too small to scatter this batch, use single-point or blank instead.");
    }
    let cursor = 0;
    const pickLocation = (): { lat: number | null; lng: number | null; accuracy: number | null } => {
      if (loc.mode === "single") return { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracyM ?? null };
      if (loc.mode === "zone-scatter") {
        const p = scattered[cursor++];
        return { lat: p.lat, lng: p.lng, accuracy: null };
      }
      return { lat: null, lng: null, accuracy: null };
    };

    // Expand the species mix into per-sapling rows (codes assigned up front so
    // QR generation can run before the transaction opens).
    const pending: { speciesId: string | null; nanoid: string; lat: number | null; lng: number | null; accuracy: number | null }[] = [];
    for (const item of parsed.data.items) {
      for (let i = 0; i < item.quantity; i++) {
        const at = pickLocation();
        pending.push({ speciesId: item.speciesId, nanoid: newPublicId(), lat: at.lat, lng: at.lng, accuracy: at.accuracy });
      }
    }

    // Server-side QR generation, chunked to keep the event loop responsive
    // (NFR: 500+ batches must not block).
    const withQr: { row: (typeof pending)[number]; svg: string }[] = [];
    for (let i = 0; i < pending.length; i += 100) {
      const chunk = pending.slice(i, i + 100);
      const svgs = await Promise.all(chunk.map((p) => qrSvg(saplingUrl(p.nanoid))));
      chunk.forEach((row, j) => withQr.push({ row, svg: svgs[j] }));
      await new Promise((r) => setImmediate(r));
    }

    const created = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(saplings)
        .values(
          withQr.map(({ row, svg }) => ({
            orgId,
            projectId: project.id,
            speciesId: row.speciesId,
            nanoid: row.nanoid,
            qrSvg: svg,
            lat: row.lat,
            lng: row.lng,
            gpsAccuracyM: row.accuracy,
            status: plantedAt ? ("planted" as const) : ("registered" as const),
            plantedAt,
            plantedBy: plantedAt ? me.session.userId : null,
            metadata: parsed.data.metadata ?? {},
          })),
        )
        .returning({ id: saplings.id, nanoid: saplings.nanoid, speciesId: saplings.speciesId, status: saplings.status, lat: saplings.lat, lng: saplings.lng, plantedAt: saplings.plantedAt, createdAt: saplings.createdAt });
      if (plantedAt) {
        await tx.insert(saplingUpdates).values(
          rows.map((r) => ({
            orgId,
            saplingId: r.id,
            status: "planted" as const,
            recordedBy: me.session.userId,
            recordedAt: plantedAt as Date,
          })),
        );
      }
      return rows;
    });

    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "sapling.bulk_create",
      entityType: "project",
      entityId: project.id,
      after: { count: created.length, mode: loc.mode, ...(plantedAt ? { plantedAt: plantedAt.toISOString() } : {}) },
    });

    // Usage metering for future billing (PRD §6.15): monthly counter.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const existing = await db.query.usageMetrics.findFirst({
      where: and(
        eq(usageMetrics.orgId, orgId),
        eq(usageMetrics.metricType, "saplings.created"),
        gte(usageMetrics.periodStart, monthStart),
        lte(usageMetrics.periodStart, monthEnd),
      ),
    });
    if (existing) {
      await db.update(usageMetrics).set({ value: existing.value + created.length }).where(eq(usageMetrics.id, existing.id));
    } else {
      await db.insert(usageMetrics).values({
        orgId,
        metricType: "saplings.created",
        value: created.length,
        periodStart: monthStart,
        periodEnd: monthEnd,
      });
    }

    // Labels printed below each QR: organization, species, planted date.
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { name: true },
    });
    const withSaplingLabels = async (rows: typeof created) => {
      const speciesIds = [...new Set(rows.map((s) => s.speciesId).filter((v): v is string => !!v))];
      const spRows = speciesIds.length
        ? await db.query.species.findMany({
            where: inArray(species.id, speciesIds),
            columns: { id: true, commonName: true },
          })
        : [];
      const names = new Map(spRows.map((sp) => [sp.id, sp.commonName]));
      return rows.map((s) => ({
        ...s,
        url: saplingUrl(s.nanoid),
        orgName: org?.name ?? null,
        speciesName: s.speciesId ? (names.get(s.speciesId) ?? null) : null,
      }));
    };

    return NextResponse.json(
      {
        created: created.length,
        projectId: project.id,
        orgName: org?.name ?? null,
        saplings: await withSaplingLabels(created),
      },
      { status: 201 },
    );
  })(req, ctx);
}
