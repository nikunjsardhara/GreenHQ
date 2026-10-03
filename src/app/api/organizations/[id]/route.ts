import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive, softDelete } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

async function loadOrg(me: Awaited<ReturnType<typeof requireUser>>, id: string) {
  const orgId = me.session.isSuperAdmin ? id : orgScope(me, { orgId: id });
  const row = await getDb().query.organizations.findFirst({
    where: and(eq(organizations.id, orgId), scopeAlive(organizations.deletedAt)),
  });
  if (!row) throw notFound("Organization not found.");
  return row;
}

const PatchBody = z.object({
  name: z.string().min(2).max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  status: z.enum(["active", "suspended"]).optional(), // super admin only
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser();
    const { id } = await ctx.params;
    return NextResponse.json({ organization: await loadOrg(me, id) });
  })(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("org.manage");
    const { id } = await ctx.params;
    const before = await loadOrg(me, id);
    const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("Invalid organization fields.");
    if (parsed.data.status && !me.session.isSuperAdmin)
      return NextResponse.json({ error: "Only super admins can suspend organizations." }, { status: 403 });
    const [after] = await getDb()
      .update(organizations)
      .set({ ...parsed.data, metadata: parsed.data.metadata ?? before.metadata, updatedAt: new Date() })
      .where(eq(organizations.id, before.id))
      .returning();
    await logAudit({
      orgId: before.id,
      userId: me.session.userId,
      action: "org.update",
      entityType: "organization",
      entityId: before.id,
      before: { name: before.name, status: before.status },
      after: { name: after.name, status: after.status },
    });
    return NextResponse.json({ organization: after });
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser();
    if (!me.session.isSuperAdmin)
      return NextResponse.json({ error: "Only super admins can delete organizations." }, { status: 403 });
    const { id } = await ctx.params;
    await loadOrg(me, id);
    await getDb().update(organizations).set(softDelete(me.session.userId)).where(eq(organizations.id, id));
    await logAudit({
      orgId: id,
      userId: me.session.userId,
      action: "org.delete",
      entityType: "organization",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
