import { desc, and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, saplings } from "@/db/schema";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { ProjectGrid } from "@/components/project-grid";
import { hasPermission } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/auth";

function ProjectsSkeleton() {
  return (
    <div aria-busy="true" className="mt-5 grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="gs-card p-5 flex flex-col gap-3">
          <div className="h-5 w-2/3 rounded-full bg-[var(--gs-line)] animate-pulse" />
          <div className="h-3 w-full rounded-full bg-[var(--gs-line)] animate-pulse" />
          <div className="h-2.5 w-full rounded-full bg-[var(--gs-line)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// First-paint project cards: projects + sapling counts only, in parallel.
// No zones, no team avatar resolution (those are the heavy joins). Keeps the
// initial dashboard to 2 concurrent queries instead of 6 + per-project N+1.
async function getProjectCardsLight(orgId: string) {
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db.query.projects.findMany({
      where: scopeOrg(projects.orgId, orgId, projects.deletedAt),
      orderBy: desc(projects.updatedAt),
      limit: 100,
    }),
    db
      .select({ projectId: saplings.projectId, n: count() })
      .from(saplings)
      .where(and(eq(saplings.orgId, orgId), scopeAlive(saplings.deletedAt)))
      .groupBy(saplings.projectId),
  ]);
  if (!rows.length) return [];
  const byProject = new Map(totals.map((t) => [t.projectId, Number(t.n)]));
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    targetCount: p.targetCount,
    saplingCount: byProject.get(p.id) ?? 0,
    team: [] as string[],
    zoneNames: [] as string[],
    startDate: p.startDate,
  }));
}

export async function DashboardProjects({ user }: { user: CurrentUser }) {
  const orgId = user.session.orgId!;
  const cards = await getProjectCardsLight(orgId);
  return <ProjectGrid projects={cards} canCreate={hasPermission(user.permissions, "project.create")} />;
}

export { ProjectsSkeleton };
