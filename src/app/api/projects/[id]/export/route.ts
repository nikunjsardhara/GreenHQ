import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { projects, saplings } from "@/db/schema";
import { api, notFound } from "@/lib/http";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive } from "@/lib/tenant";
import { toCsv } from "@/lib/csv";
import { saplingUrl } from "@/lib/qr";
import { and, asc, eq } from "drizzle-orm";

// GET /api/projects/[id]/export?format=csv, PRD §6.11 report export.
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("report.export");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const db = getDb();
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.orgId, orgId), scopeAlive(projects.deletedAt)),
    });
    if (!project) throw notFound("Project not found.");

    const rows = await db.query.saplings.findMany({
      where: and(eq(saplings.projectId, project.id), scopeAlive(saplings.deletedAt)),
      orderBy: asc(saplings.createdAt),
      with: { species: true },
      limit: 10000,
    });
    const csv = toCsv(
      rows.map((s) => ({
        nanoid: s.nanoid,
        url: saplingUrl(s.nanoid),
        species: s.species?.commonName ?? "",
        status: s.status,
        lat: s.lat ?? "",
        lng: s.lng ?? "",
        planted_at: s.plantedAt?.toISOString() ?? "",
        registered_at: s.createdAt.toISOString(),
      })),
      ["nanoid", "url", "species", "status", "lat", "lng", "planted_at", "registered_at"],
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="project-${project.id}-saplings.csv"`,
      },
    });
  })(req, ctx);
}
