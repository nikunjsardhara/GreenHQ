import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { saplingUpdates, saplings } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { eq } from "drizzle-orm";
import { findSaplingByCode } from "@/lib/saplings";

// PATCH /api/saplings/[nanoid]/location, correct a sapling's GPS point
// (field activation sets it first; this fixes drift or missing points).
// Logged to the timeline so the move history stays truthful.
const Body = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100000).nullable().optional(),
  note: z.string().max(1000).optional(),
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
    const { lat, lng } = parsed.data;
    const db = getDb();
    const [after] = await db
      .update(saplings)
      .set({
        lat,
        lng,
        gpsAccuracyM: parsed.data.accuracyM ?? null,
        updatedAt: new Date(),
      })
      .where(eq(saplings.id, before.id))
      .returning();
    await db.insert(saplingUpdates).values({
      orgId,
      saplingId: before.id,
      status: before.status,
      photoUrl: null,
      note: parsed.data.note || "Location updated.",
      recordedBy: me.session.userId,
    });
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "sapling.location",
      entityType: "sapling",
      entityId: before.id,
      before: { lat: before.lat, lng: before.lng },
      after: { lat, lng },
    });
    return NextResponse.json({ sapling: after });
  })(req, ctx);
}
