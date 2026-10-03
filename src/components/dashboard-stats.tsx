import { Sprout, CloudSun, FolderKanban } from "lucide-react";
import { and, count, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, saplings, species } from "@/db/schema";
import { Stat } from "@/components/ui";

function StatsSkeleton() {
  return (
    <section aria-label="Impact" aria-busy="true" className="gs-card p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--gs-line)] animate-pulse shrink-0" aria-hidden />
          <span className="flex flex-col gap-1.5">
            <span className="block h-5 w-12 rounded-full bg-[var(--gs-line)] animate-pulse" aria-hidden />
            <span className="block h-3 w-16 rounded-full bg-[var(--gs-line)] animate-pulse" aria-hidden />
          </span>
        </div>
      ))}
    </section>
  );
}

// Counts + CO₂ via 3 concurrent indexed queries, no 100k row fetch, no N+1.
// Runs only inside a Suspense boundary so the page shell paints first.
export async function DashboardStats({ orgId }: { orgId: string }) {
  const db = getDb();
  const aliveSaplings = and(eq(saplings.orgId, orgId), isNull(saplings.deletedAt));
  const aliveProjects = and(eq(projects.orgId, orgId), isNull(projects.deletedAt));
  // CO₂: single JOIN + SUM on the DB, not JS over 100k rows.
  const [sapRes, projRes, co2Res] = await Promise.all([
    db.select({ n: count() }).from(saplings).where(aliveSaplings),
    db.select({ n: count() }).from(projects).where(aliveProjects),
    db
      .select({ total: sql<number>`coalesce(sum(${species.co2KgPerYear}), 0)` })
      .from(saplings)
      .innerJoin(species, eq(saplings.speciesId, species.id))
      .where(
        and(
          eq(saplings.orgId, orgId),
          isNull(saplings.deletedAt),
          isNotNull(saplings.speciesId),
          sql`${saplings.status} not in ('lost','registered')`,
          isNull(species.deletedAt),
        ),
      ),
  ]);

  const totalSaplings = Number(sapRes[0]?.n ?? 0);
  const totalProjects = Number(projRes[0]?.n ?? 0);
  const co2KgPerYear = Math.round(Number(co2Res[0]?.total ?? 0) * 10) / 10;

  return (
    <section aria-label="Impact" className="gs-card p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Stat icon={<Sprout size={22} aria-hidden />} value={String(totalSaplings)} label="Saplings" />
      <Stat icon={<CloudSun size={22} aria-hidden />} value={`${co2KgPerYear} kg`} label="CO₂ / year" />
      <Stat icon={<FolderKanban size={22} aria-hidden />} value={String(totalProjects)} label="Projects" />
    </section>
  );
}

export { StatsSkeleton };
