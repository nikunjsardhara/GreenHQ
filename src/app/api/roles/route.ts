import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { isValidPermission } from "@/lib/permissions";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeOrg, softDelete } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// GET /api/roles, org's composable roles (PRD §4 permission model).
export const GET = api(async () => {
  const me = await requireUser("project.read");
  const orgId = orgScope(me, {});
  const rows = await getDb().query.roles.findMany({
    where: scopeOrg(roles.orgId, orgId, roles.deletedAt),
  });
  return NextResponse.json({ roles: rows });
});

const Body = z.object({ name: z.string().min(2).max(80), permissions: z.array(z.string()) });

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("role.manage");
  const orgId = orgScope(me, {});
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("name and permissions[] are required.");
  const unknown = parsed.data.permissions.filter((p) => !isValidPermission(p));
  if (unknown.length) throw badRequest(`Unknown permissions: ${unknown.join(", ")}`);
  const [row] = await getDb().insert(roles).values({ orgId, ...parsed.data }).returning();
  await logAudit({ orgId, userId: me.session.userId, action: "role.create", entityType: "role", entityId: row.id, after: { name: row.name } });
  return NextResponse.json({ role: row }, { status: 201 });
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("role.manage");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("name and permissions[] are required.");
    const row = await getDb().query.roles.findFirst({
      where: and(eq(roles.id, id), scopeOrg(roles.orgId, orgId, roles.deletedAt)),
    });
    if (!row) throw notFound("Role not found.");
    const [after] = await getDb().update(roles).set({ ...parsed.data }).where(eq(roles.id, id)).returning();
    await logAudit({ orgId, userId: me.session.userId, action: "role.update", entityType: "role", entityId: id, after: { name: after.name } });
    return NextResponse.json({ role: after });
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("role.manage");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const row = await getDb().query.roles.findFirst({
      where: and(eq(roles.id, id), scopeOrg(roles.orgId, orgId, roles.deletedAt)),
    });
    if (!row) throw notFound("Role not found.");
    await getDb().update(roles).set(softDelete(me.session.userId)).where(eq(roles.id, id));
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
