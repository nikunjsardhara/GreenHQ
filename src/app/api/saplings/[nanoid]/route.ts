import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { saplings } from "@/db/schema";
import { api, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { softDelete } from "@/lib/tenant";
import { findSaplingByCode } from "@/lib/saplings";
import { saplingUrl } from "@/lib/qr";
import { and, eq, or } from "drizzle-orm";

// GET /api/saplings/[nanoid], internal detail (scoped to caller's org,
// super admin may pass ?orgId=).
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("sapling.read");
    const { nanoid } = await ctx.params;
    const orgId = me.session.isSuperAdmin ? (req.nextUrl.searchParams.get("orgId") ?? null) : me.session.orgId;
    if (!me.session.isSuperAdmin && !orgId) throw notFound("Sapling not found.");
    const row = await findSaplingByCode(orgId, nanoid);
    if (!row) throw notFound("Sapling not found.");
    if (!me.session.isSuperAdmin && row.orgId !== me.session.orgId) throw notFound("Sapling not found.");
    return NextResponse.json({ sapling: { ...row, url: saplingUrl(row.nanoid) } });
  })(req, ctx);
}

// DELETE /api/saplings/[nanoid], soft delete (sapling.delete).
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("sapling.delete");
    const { nanoid } = await ctx.params;
    const orgId = orgScope(me, {});
    const row = await findSaplingByCode(orgId, nanoid);
    if (!row) throw notFound("Sapling not found.");
    await getDb().update(saplings).set(softDelete(me.session.userId)).where(eq(saplings.id, row.id));
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "sapling.delete",
      entityType: "sapling",
      entityId: row.nanoid,
      before: { nanoid: row.nanoid, status: row.status },
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}

// POST /api/saplings/[nanoid]/restore, undo a soft delete (sapling.delete).
// Accepts either the public nanoid or the internal uuid (audit log stores both
// shapes across entity types).
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("sapling.delete");
    const { nanoid } = await ctx.params;
    const orgId = orgScope(me, {});
    const db = getDb();
    const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nanoid);
    const row = await db.query.saplings.findFirst({
      where: and(
        looksUuid ? or(eq(saplings.nanoid, nanoid), eq(saplings.id, nanoid)) : eq(saplings.nanoid, nanoid),
        eq(saplings.orgId, orgId),
      ),
    });
    if (!row || !row.deletedAt) throw notFound("Deleted sapling not found.");
    await db.update(saplings).set({ deletedAt: null, deletedBy: null }).where(eq(saplings.id, row.id));
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "sapling.restore",
      entityType: "sapling",
      entityId: row.nanoid,
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
