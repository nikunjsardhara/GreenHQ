import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { saplings } from "@/db/schema";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeOrg } from "@/lib/tenant";
import { and, eq, inArray } from "drizzle-orm";

// PATCH /api/saplings/bulk-metadata, PRD §6.11 bulk sapling metadata
// correction: merge a metadata patch into many saplings by nanoid.
// (Static route: takes precedence over /api/saplings/[nanoid].)
const Body = z.object({
  nanoids: z.array(z.string().min(1)).min(1).max(500),
  metadata: z.record(z.string(), z.unknown()),
});

export const PATCH = api(async (req: NextRequest) => {
  const me = await requireUser("sapling.update_status");
  const orgId = orgScope(me, {});
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("nanoids[] and a metadata object are required.");
  const db = getDb();
  const rows = await db.query.saplings.findMany({
    where: and(inArray(saplings.nanoid, parsed.data.nanoids), scopeOrg(saplings.orgId, orgId, saplings.deletedAt)),
    columns: { id: true, nanoid: true, metadata: true },
  });
  let updated = 0;
  for (const row of rows) {
    await db
      .update(saplings)
      .set({ metadata: { ...(row.metadata ?? {}), ...parsed.data.metadata }, updatedAt: new Date() })
      .where(eq(saplings.id, row.id));
    updated++;
  }
  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "sapling.bulk_metadata",
    entityType: "sapling",
    entityId: `${updated} saplings`,
    after: parsed.data.metadata,
  });
  const found = new Set(rows.map((r) => r.nanoid));
  return NextResponse.json({
    updated,
    unknown: parsed.data.nanoids.filter((n) => !found.has(n)),
  });
});
