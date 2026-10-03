import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { saplingUpdates, saplings } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { orgScope, requireUser } from "@/lib/server-auth";
import { eq } from "drizzle-orm";
import { findSaplingByCode } from "@/lib/saplings";

// PATCH /api/saplings/[nanoid]/activate, PRD §5.4 field activation.
// A volunteer scans a pre-printed QR in the field to attach the real GPS
// point, planting date and photo. Registered → Planted.
const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100000).optional(),
  photoUrl: z.string().url().optional(),
  note: z.string().max(1000).optional(),
  plantedAt: z.string().datetime().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("sapling.update_status");
    const { nanoid } = await ctx.params;
    const orgId = orgScope(me, {});
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("lat/lng are required.");
    const before = await findSaplingByCode(orgId, nanoid);
    if (!before) throw notFound("Sapling not found.");
    if (before.status !== "registered")
      return NextResponse.json({ error: "Only Registered saplings can be activated." }, { status: 409 });

    const db = getDb();
    const plantedAt = parsed.data.plantedAt ? new Date(parsed.data.plantedAt) : new Date();
    const [after] = await db
      .update(saplings)
      .set({
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        gpsAccuracyM: parsed.data.accuracyM ?? null,
        status: "planted",
        plantedAt,
        plantedBy: me.session.userId,
        updatedAt: new Date(),
      })
      .where(eq(saplings.id, before.id))
      .returning();
    await db.insert(saplingUpdates).values({
      orgId,
      saplingId: before.id,
      status: "planted",
      photoUrl: parsed.data.photoUrl ?? null,
      note: parsed.data.note ?? null,
      recordedBy: me.session.userId,
      recordedAt: plantedAt,
    });
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "sapling.activate",
      entityType: "sapling",
      entityId: before.id,
      before: { status: before.status },
      after: { status: "planted", lat: parsed.data.lat, lng: parsed.data.lng },
    });
    await notify({
      orgId,
      userId: null,
      type: "sapling.status_changed",
      payload: { saplingId: before.id, nanoid, from: "registered", to: "planted" },
    });
    return NextResponse.json({ sapling: after });
  })(req, ctx);
}

// Alias for the offline outbox path naming.
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return PATCH(req, ctx);
}
