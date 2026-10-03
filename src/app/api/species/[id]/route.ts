import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { species } from "@/db/schema";
import { api, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/server-auth";
import { scopeAlive, softDelete } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("species.manage");
    const { id } = await ctx.params;
    const db = getDb();
    const row = await db.query.species.findFirst({
      where: and(eq(species.id, id), scopeAlive(species.deletedAt)),
    });
    if (!row) throw notFound("Species not found.");
    if (!me.session.isSuperAdmin && row.orgId !== me.session.orgId)
      return NextResponse.json({ error: "Cannot delete catalog entries from another scope." }, { status: 403 });
    await db.update(species).set(softDelete(me.session.userId)).where(eq(species.id, id));
    await logAudit({
      orgId: row.orgId,
      userId: me.session.userId,
      action: "species.delete",
      entityType: "species",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}

// POST /api/species/[id]/restore, undo a soft delete (species.manage).
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("species.manage");
    const { id } = await ctx.params;
    const db = getDb();
    const row = await db.query.species.findFirst({ where: eq(species.id, id) });
    if (!row || !row.deletedAt) throw notFound("Deleted species not found.");
    if (!me.session.isSuperAdmin && row.orgId !== me.session.orgId)
      return NextResponse.json({ error: "Cannot restore catalog entries from another scope." }, { status: 403 });
    await db.update(species).set({ deletedAt: null, deletedBy: null }).where(eq(species.id, id));
    await logAudit({
      orgId: row.orgId,
      userId: me.session.userId,
      action: "species.restore",
      entityType: "species",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
