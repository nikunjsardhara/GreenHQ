import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, saplings } from "@/db/schema";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeOrg } from "@/lib/tenant";
import { and, count, desc, eq, ilike, isNull, or } from "drizzle-orm";

// GET /api/projects?status=&q=, scoped list with live sapling counts.
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("project.read");
  const orgId = orgScope(me, { orgId: req.nextUrl.searchParams.get("orgId") });
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const db = getDb();

  // PRD §3.2: admins with delete rights can list deleted records (to restore).
  const withDeleted =
    req.nextUrl.searchParams.get("withDeleted") === "true" && hasPermission(me.permissions, "project.delete");
  const filters = withDeleted
    ? [eq(projects.orgId, orgId)]
    : [scopeOrg(projects.orgId, orgId, projects.deletedAt)];
  if (status) filters.push(eq(projects.status, status as "active" | "planning" | "completed" | "archived"));
  if (q) filters.push(or(ilike(projects.name, `%${q}%`), ilike(projects.description, `%${q}%`))!);

  const rows = await db.query.projects.findMany({
    where: and(...filters),
    orderBy: desc(projects.updatedAt),
    limit: 100,
  });
  // Live per-project sapling counts (scoped to org, alive only).
  const totals = await db
    .select({ projectId: saplings.projectId, n: count() })
    .from(saplings)
    .where(and(eq(saplings.orgId, orgId), isNull(saplings.deletedAt)))
    .groupBy(saplings.projectId);
  const byProject = new Map(totals.map((t) => [t.projectId, Number(t.n)]));
  return NextResponse.json({
    projects: rows.map((p) => ({ ...p, saplingCount: byProject.get(p.id) ?? 0 })),
  });
});

// POST /api/projects, create (project.create).
const CreateBody = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  notes: z.string().max(10000).optional(),
  coverImage: z.string().url().optional(),
  status: z.enum(["planning", "active", "completed", "archived"]).default("planning"),
  targetCount: z.number().int().min(0).default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  zoneGeojson: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("project.create");
  const orgId = orgScope(me, {});
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("Project name is required.");
  const [row] = await getDb()
    .insert(projects)
    .values({ ...parsed.data, orgId, zoneGeojson: parsed.data.zoneGeojson ?? null, createdBy: me.session.userId })
    .returning();
  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "project.create",
    entityType: "project",
    entityId: row.id,
    after: { name: row.name },
  });
  return NextResponse.json({ project: row }, { status: 201 });
});
