import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { saplingUpdates, saplings, type SaplingStatus } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { orgScope, requireUser } from "@/lib/server-auth";
import { eq } from "drizzle-orm";
import { findSaplingByCode } from "@/lib/saplings";
import { canTransition } from "@/lib/lifecycle";
import { resolvePlantedAt } from "@/lib/planting";
import { hasPermission } from "@/lib/permissions";

// PATCH /api/saplings/[nanoid]/status, lifecycle transitions (PRD §5.3).
// Every change is logged with timestamp, user, optional photo/note. Moving to
// "planted" also stamps the plantation date: an explicit `plantedAt` (from the
// plantation-date dialog) wins, otherwise the date of change is used, so
// every planted sapling carries when it was planted.
const Body = z.object({
  status: z.enum(["registered", "planted", "growing", "mature", "lost", "replaced"]),
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
    if (!parsed.success) throw badRequest("A valid status is required.");
    const before = await findSaplingByCode(orgId, nanoid);
    if (!before) throw notFound("Sapling not found.");
    const next = parsed.data.status as SaplingStatus;
    const from = before.status as SaplingStatus;
    // Guided lifecycle moves need sapling.update_status (checked above);
    // arbitrary jumps additionally require sapling.override_status.
    if (!canTransition(from, next)) {
      if (!hasPermission(me.permissions, "sapling.override_status")) {
        return NextResponse.json(
          { error: `Cannot move from ${from} to ${next} without the sapling.override_status permission.` },
          { status: 403 },
        );
      }
      await logAudit({
        orgId,
        userId: me.session.userId,
        action: "sapling.status_override",
        entityType: "sapling",
        entityId: before.id,
        before: { status: before.status },
        after: { status: next },
      });
    }
    const db = getDb();
    const now = new Date();
    let stamp: Date | undefined;
    try {
      stamp = resolvePlantedAt({
        target: next,
        currentPlantedAt: before.plantedAt,
        explicitRaw: parsed.data.plantedAt,
        now,
      });
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : "Invalid plantation date.");
    }
    const [after] = await db
      .update(saplings)
      .set({
        status: next,
        ...(stamp ? { plantedAt: stamp, plantedBy: me.session.userId } : {}),
        updatedAt: now,
      })
      .where(eq(saplings.id, before.id))
      .returning();
    await db.insert(saplingUpdates).values({
      orgId,
      saplingId: before.id,
      status: next,
      photoUrl: parsed.data.photoUrl ?? null,
      note: parsed.data.note ?? null,
      recordedBy: me.session.userId,
      ...(stamp ? { recordedAt: stamp } : {}),
    });
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "sapling.status",
      entityType: "sapling",
      entityId: before.id,
      before: { status: before.status },
      after: { status: next, ...(stamp ? { plantedAt: stamp.toISOString() } : {}) },
    });
    await notify({
      orgId,
      userId: null,
      type: "sapling.status_changed",
      payload: { saplingId: before.id, nanoid, from: before.status, to: next },
    });
    return NextResponse.json({ sapling: after });
  })(req, ctx);
}
