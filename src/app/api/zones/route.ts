import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, zones } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeOrg, softDelete } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// GET /api/zones?projectId=, POST create (project.update draws zones).
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("project.read");
  const orgId = orgScope(me, {});
  const projectId = req.nextUrl.searchParams.get("projectId");
  const filters = [scopeOrg(zones.orgId, orgId, zones.deletedAt)];
  if (projectId) filters.push(eq(zones.projectId, projectId));
  const rows = await getDb().query.zones.findMany({ where: and(...filters), limit: 200 });
  return NextResponse.json({ zones: rows });
});

const Body = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(120),
  polygonGeojson: z.record(z.string(), z.unknown()),
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("project.update");
  const orgId = orgScope(me, {});
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("projectId, name and polygonGeojson are required.");
  const project = await getDb().query.projects.findFirst({
    where: and(eq(projects.id, parsed.data.projectId), scopeOrg(projects.orgId, orgId, projects.deletedAt)),
  });
  if (!project) throw notFound("Project not found.");
  const [row] = await getDb().insert(zones).values({ ...parsed.data, orgId }).returning();
  await logAudit({ orgId, userId: me.session.userId, action: "zone.create", entityType: "zone", entityId: row.id });
  return NextResponse.json({ zone: row }, { status: 201 });
});

export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("project.update");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const row = await getDb().query.zones.findFirst({
      where: and(eq(zones.id, id), scopeOrg(zones.orgId, orgId, zones.deletedAt)),
    });
    if (!row) throw notFound("Zone not found.");
    await getDb().update(zones).set(softDelete(me.session.userId)).where(eq(zones.id, id));
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
