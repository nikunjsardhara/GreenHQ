import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { roles, users } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeOrg, softDelete } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";

// GET /api/users, org roster (user.manage). Super admins pass ?orgId=
// (or ?orgId=all with user.manage everywhere, here: any single org).
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("user.manage");
  const orgId = orgScope(me, { orgId: req.nextUrl.searchParams.get("orgId") });
  const rows = await getDb().query.users.findMany({
    where: scopeOrg(users.orgId, orgId, users.deletedAt),
    orderBy: desc(users.createdAt),
    columns: { passwordHash: false },
    with: { role: true },
    limit: 200,
  });
  return NextResponse.json({ users: rows });
});

// PATCH /api/users/[id], change role / suspend / reactivate.
const PatchBody = z.object({
  roleId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "invited", "suspended"]).optional(),
  name: z.string().min(1).max(120).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("user.manage");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("Invalid user fields.");
    const db = getDb();
    const row = await db.query.users.findFirst({
      where: and(eq(users.id, id), scopeOrg(users.orgId, orgId, users.deletedAt)),
    });
    if (!row) throw notFound("User not found.");
    if (parsed.data.roleId) {
      const role = await db.query.roles.findFirst({
        where: and(eq(roles.id, parsed.data.roleId), scopeOrg(roles.orgId, orgId, roles.deletedAt)),
      });
      if (!role) throw badRequest("Unknown role for this organization.");
    }
    const [after] = await db.update(users).set(parsed.data).where(eq(users.id, id)).returning({ id: users.id, email: users.email, name: users.name, status: users.status, roleId: users.roleId });
    await logAudit({ orgId, userId: me.session.userId, action: "user.update", entityType: "user", entityId: id, before: { status: row.status }, after: { status: after.status } });
    return NextResponse.json({ user: after });
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("user.manage");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    if (id === me.session.userId) return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
    const row = await getDb().query.users.findFirst({
      where: and(eq(users.id, id), scopeOrg(users.orgId, orgId, users.deletedAt)),
    });
    if (!row) throw notFound("User not found.");
    await getDb().update(users).set(softDelete(me.session.userId)).where(eq(users.id, id));
    await logAudit({ orgId, userId: me.session.userId, action: "user.delete", entityType: "user", entityId: id });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
