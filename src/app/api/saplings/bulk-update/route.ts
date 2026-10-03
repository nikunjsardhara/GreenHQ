import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { saplingUpdates, saplings, species, type SaplingStatus } from "@/db/schema";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { canTransition } from "@/lib/lifecycle";
import { resolvePlantedAt } from "@/lib/planting";
import { and, eq, inArray } from "drizzle-orm";

// PATCH /api/saplings/bulk-update, one-shot correction of plantation date,
// species, lifecycle status and timeline notes for a manual selection of
// saplings (up to 500 by nanoid). Omitted field = no change; explicit null
// = clear (unassign species / remove plantation date). Setting a date on a
// Registered sapling moves it to Planted with a timeline entry, mirroring
// creation + activation. Explicit status moves follow the lifecycle guard:
// guided moves need sapling.update_status, jumps additionally require
// sapling.override_status, saplings that fail the guard are reported in
// `skipped` instead of failing the whole batch.
const Body = z
  .object({
    nanoids: z.array(z.string().min(1)).min(1).max(500),
    speciesId: z.string().uuid().nullable().optional(),
    plantedAt: z.string().datetime().nullable().optional(),
    status: z.enum(["registered", "planted", "growing", "mature", "lost", "replaced"]).optional(),
    note: z.string().max(1000).optional(),
  })
  .refine((d) => d.speciesId !== undefined || d.plantedAt !== undefined || d.status !== undefined || d.note !== undefined, {
    message: "Nothing to update, provide speciesId, plantedAt, status and/or note.",
  });

export const PATCH = api(async (req: NextRequest) => {
  const me = await requireUser("sapling.update_status");
  const orgId = orgScope(me, {});
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("nanoids[] and at least one update field are required.");
  const { nanoids, speciesId, plantedAt: plantedAtRaw, status: targetStatus, note } = parsed.data;
  const canOverride = hasPermission(me.permissions, "sapling.override_status");

  let speciesName: string | null = null;
  if (speciesId !== undefined && speciesId !== null) {
    const sp = await getDb().query.species.findFirst({
      where: and(eq(species.id, speciesId), scopeAlive(species.deletedAt)),
      columns: { id: true, commonName: true, orgId: true },
    });
    if (!sp || (sp.orgId !== null && sp.orgId !== orgId)) throw badRequest("Unknown species.");
    speciesName = sp.commonName;
  }

  let plantedAt: Date | null | undefined;
  if (plantedAtRaw !== undefined) {
    if (plantedAtRaw === null) {
      plantedAt = null;
    } else {
      const d = new Date(plantedAtRaw);
      if (Number.isNaN(d.getTime())) throw badRequest("plantedAt is not a valid date.");
      if (d.getTime() > Date.now()) throw badRequest("Plantation date cannot be in the future.");
      plantedAt = d;
    }
  }

  const db = getDb();
  const rows = await db.query.saplings.findMany({
    where: and(inArray(saplings.nanoid, nanoids), scopeOrg(saplings.orgId, orgId, saplings.deletedAt)),
    columns: { id: true, nanoid: true, status: true, speciesId: true, plantedAt: true },
  });
  const found = new Set(rows.map((r) => r.nanoid));

  let updated = 0;
  let transitionedToPlanted = 0;
  let statusChanged = 0;
  let defaultedDates = 0;
  const skipped: { nanoid: string; reason: string }[] = [];
  for (const row of rows) {
    const from = row.status as SaplingStatus;
    let next: SaplingStatus | null = null;
    if (targetStatus !== undefined && targetStatus !== from) {
      if (!canTransition(from, targetStatus as SaplingStatus) && !canOverride) {
        skipped.push({ nanoid: row.nanoid, reason: `Cannot move from ${from} to ${targetStatus}.` });
        continue;
      }
      next = targetStatus as SaplingStatus;
    } else if (plantedAt instanceof Date && from === "registered") {
      next = "planted";
    }

    const set: Partial<{
      speciesId: string | null;
      plantedAt: Date | null;
      status: SaplingStatus;
      plantedBy: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };
    if (speciesId !== undefined) set.speciesId = speciesId;
    if (plantedAt !== undefined) set.plantedAt = plantedAt;
    // Moving to planted without an explicit date stamps the date of change
    // (unless the sapling already carries one), every planted sapling must
    // have when it was planted. An explicit null (clear date) is respected.
    let stamp: Date | undefined;
    if (next === "planted" && plantedAt === undefined) {
      stamp = resolvePlantedAt({ target: next, currentPlantedAt: row.plantedAt, now: set.updatedAt });
      if (stamp) {
        set.plantedAt = stamp;
        set.plantedBy = me.session.userId;
        defaultedDates++;
      }
    }
    if (next) {
      set.status = next;
      if (next === "planted" && (plantedAt instanceof Date || stamp)) set.plantedBy = me.session.userId;
    }
    await db.update(saplings).set(set).where(eq(saplings.id, row.id));
    if (next) {
      statusChanged++;
      const recordedDate = plantedAt instanceof Date ? plantedAt : stamp;
      if (next === "planted" && from === "registered" && recordedDate) transitionedToPlanted++;
      await db.insert(saplingUpdates).values({
        orgId,
        saplingId: row.id,
        status: next,
        photoUrl: null,
        note: note ?? null,
        recordedBy: me.session.userId,
        ...(next === "planted" && recordedDate ? { recordedAt: recordedDate } : {}),
      });
    } else if (note) {
      await db.insert(saplingUpdates).values({
        orgId,
        saplingId: row.id,
        status: from,
        photoUrl: null,
        note,
        recordedBy: me.session.userId,
      });
    }
    updated++;
  }

  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "sapling.bulk_update",
    entityType: "sapling",
    entityId: `${updated} saplings`,
    after: {
      count: updated,
      ...(speciesId !== undefined ? { speciesId, speciesName } : {}),
      ...(plantedAt !== undefined ? { plantedAt: plantedAt?.toISOString() ?? null } : {}),
      ...(targetStatus !== undefined ? { status: targetStatus } : {}),
      ...(note ? { note: true } : {}),
      statusChanged,
      transitionedToPlanted,
      defaultedDates,
      skipped: skipped.length,
    },
  });

  return NextResponse.json({
    updated,
    statusChanged,
    transitionedToPlanted,
    skipped,
    unknown: nanoids.filter((n) => !found.has(n)),
  });
});
