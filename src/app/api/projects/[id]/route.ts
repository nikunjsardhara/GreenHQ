import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, saplings, zones } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive, scopeOrg, softDelete } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";

async function loadProject(
  me: Awaited<ReturnType<typeof requireUser>>,
  id: string,
  orgParam: string | null,
) {
  const db = getDb();
  if (me.session.isSuperAdmin && !orgParam) {
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), scopeAlive(projects.deletedAt)),
    });
    if (!row) throw notFound("Project not found.");
    return row;
  }
  const orgId = orgScope(me, { orgId: orgParam });
  const row = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), scopeOrg(projects.orgId, orgId, projects.deletedAt)),
  });
  if (!row) throw notFound("Project not found.");
  return row;
}

export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("project.read");
    const { id } = await ctx.params;
    const project = await loadProject(me, id, req.nextUrl.searchParams.get("orgId"));
    const db = getDb();
    const recent = await db.query.saplings.findMany({
      where: and(eq(saplings.projectId, project.id), scopeAlive(saplings.deletedAt)),
      orderBy: desc(saplings.createdAt),
      limit: 20,
      with: { species: true },
    });
    const zoneRows = await db.query.zones.findMany({
      where: and(eq(zones.projectId, project.id), scopeAlive(zones.deletedAt)),
    });
    return NextResponse.json({ project, recentSaplings: recent, zones: zoneRows });
  })(req, ctx);
}

const PatchBody = z.object({
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  status: z.enum(["planning", "active", "completed", "archived"]).optional(),
  targetCount: z.number().int().min(0).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  zoneGeojson: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("project.update");
    const { id } = await ctx.params;
    const before = await loadProject(me, id, req.nextUrl.searchParams.get("orgId"));
    const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("Invalid project fields.");
    const [after] = await getDb()
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, before.id))
      .returning();
    await logAudit({
      orgId: before.orgId,
      userId: me.session.userId,
      action: "project.update",
      entityType: "project",
      entityId: before.id,
      before: { name: before.name, status: before.status },
      after: { name: after.name, status: after.status },
    });
    return NextResponse.json({ project: after });
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("project.delete");
    const { id } = await ctx.params;
    const before = await loadProject(me, id, req.nextUrl.searchParams.get("orgId"));
    await getDb().update(projects).set(softDelete(me.session.userId)).where(eq(projects.id, before.id));
    await logAudit({
      orgId: before.orgId,
      userId: me.session.userId,
      action: "project.delete",
      entityType: "project",
      entityId: before.id,
      before: { name: before.name },
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}

// POST /api/projects/[id]/restore, undo a soft delete (project.delete).
// PRD §3.2: admins can restore deleted records.
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("project.delete");
    const { id } = await ctx.params;
    const orgId = me.session.isSuperAdmin ? (req.nextUrl.searchParams.get("orgId") ?? null) : orgScope(me, {});
    const db = getDb();
    const where = orgId
      ? and(eq(projects.id, id), eq(projects.orgId, orgId))
      : and(eq(projects.id, id), scopeAlive(projects.deletedAt));
    const row = await db.query.projects.findFirst({ where });
    if (!row || !row.deletedAt) throw notFound("Deleted project not found.");
    await db.update(projects).set({ deletedAt: null, deletedBy: null }).where(eq(projects.id, row.id));
    await logAudit({
      orgId: row.orgId,
      userId: me.session.userId,
      action: "project.restore",
      entityType: "project",
      entityId: row.id,
    });
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
