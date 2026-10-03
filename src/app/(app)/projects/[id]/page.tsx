import Link from "next/link";
import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { projects, saplings, saplingUpdates, species, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ActionLink } from "@/components/ui";
import { SaplingList } from "@/components/sapling-list";
import { ProjectActions } from "./actions";
import { ProjectMap } from "./map";
import { ProjectHeader } from "./project-header";
import { ProjectNotes } from "./project-notes";
import { ProjectOverview } from "./project-overview";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { geojsonAreaHa } from "@/lib/geo";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = (await getCurrentUser())!;
  const orgId = u.session.orgId ?? undefined;
  const db = getDb();

  const project = await db.query.projects.findFirst({
    where: orgId
      ? and(eq(projects.id, id), scopeOrg(projects.orgId, orgId, projects.deletedAt))
      : and(eq(projects.id, id), scopeAlive(projects.deletedAt)),
  });
  if (!project) notFound();

  const [{ n }] = await db
    .select({ n: count() })
    .from(saplings)
    .where(and(eq(saplings.projectId, project.id), scopeAlive(saplings.deletedAt)));
  const saplingCount = Number(n);
  const recent = await db.query.saplings.findMany({
    where: and(eq(saplings.projectId, project.id), scopeAlive(saplings.deletedAt)),
    orderBy: desc(saplings.createdAt),
    limit: 10,
    with: { species: true },
  });

  // Team avatar-stack: recent contributors to this project.
  const recentUpdates = await db.query.saplingUpdates.findMany({
    where: and(
      eq(saplingUpdates.orgId, project.orgId),
      inArray(
        saplingUpdates.saplingId,
        recent.map((s) => s.id),
      ),
    ),
    orderBy: desc(saplingUpdates.recordedAt),
    limit: 20,
  });
  const contributorIds = [...new Set(recentUpdates.map((x) => x.recordedBy).filter(Boolean))] as string[];
  const contributors = contributorIds.length
    ? await db.query.users.findMany({ where: inArray(users.id, contributorIds), columns: { name: true } })
    : [];
  const areaHa = Math.round(geojsonAreaHa(project.zoneGeojson as { coordinates?: [number, number][][] } | null) * 10) / 10;

  // All saplings of this project for the inline browser with bulk selection.
  const projectSaplings = await db.query.saplings.findMany({
    where: and(eq(saplings.projectId, project.id), scopeAlive(saplings.deletedAt)),
    orderBy: desc(saplings.createdAt),
    limit: 500,
    with: {
      species: { columns: { id: true, commonName: true } },
    },
  });
  const catalog = await db.query.species.findMany({
    where: and(
      scopeAlive(species.deletedAt),
      or(isNull(species.orgId), eq(species.orgId, project.orgId)),
    ),
    columns: { id: true, commonName: true },
  });
  const speciesTotals = await db
    .select({ speciesId: saplings.speciesId, n: count() })
    .from(saplings)
    .where(and(eq(saplings.projectId, project.id), scopeAlive(saplings.deletedAt)))
    .groupBy(saplings.speciesId);
  const bySpecies = new Map(speciesTotals.map((t) => [t.speciesId, Number(t.n)]));
  const facets = catalog
    .map((c) => ({ id: c.id, name: c.commonName, count: bySpecies.get(c.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <ProjectHeader
        name={project.name}
        status={project.status}
        description={project.description}
        startDate={project.startDate}
        createdAt={project.createdAt}
        coverImage={project.coverImage}
        team={contributors.map((c) => c.name)}
      />

      {/* Management toolbar, everything that mutates or exports the project */}
      <div className="no-print">
        <ProjectActions
          projectId={project.id}
          currentStatus={project.status}
          currentStartDate={project.startDate}
          canEdit={hasPermission(u.permissions, "project.update")}
        />
      </div>

      <ProjectOverview
        saplingCount={saplingCount}
        targetCount={project.targetCount}
        areaHa={areaHa}
      />

      <ProjectNotes
        projectId={project.id}
        initialNotes={project.notes}
        canEdit={hasPermission(u.permissions, "project.update")}
      />

      <ProjectMap zone={project.zoneGeojson as { coordinates?: [number, number][][] } | null} areaHa={areaHa} />

      {/* Primary sapling CTAs */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 items-center no-print">
        <Link
          href={`/projects/${project.id}/bulk`}
          className="gs-chip !bg-[var(--gs-ink)] !text-white !px-5 !py-3 inline-flex items-center gap-1.5"
        >
          <Plus size={16} aria-hidden /> Bulk create saplings
        </Link>
        <ActionLink href={`/saplings?projectId=${project.id}`}>View all saplings</ActionLink>
      </div>

      {/* Saplings browser, filtering, pagination and bulk-edit live here */}
      <section aria-label="Saplings">
        <div className="flex items-baseline justify-between gap-3 mt-2 mb-3">
          <h2 className="text-xl font-bold text-[var(--gs-ink)]">Saplings</h2>
          <p className="text-xs text-[var(--gs-muted)]" role="status">
            {projectSaplings.length} in this project
          </p>
        </div>
        {projectSaplings.length === 0 ? (
          <p className="text-sm text-[var(--gs-muted)]">No saplings yet, bulk-create the first batch.</p>
        ) : (
          <SaplingList
            saplings={projectSaplings.map((s) => ({
              nanoid: s.nanoid,
              status: s.status,
              species: s.species ? { id: s.species.id, commonName: s.species.commonName } : null,
              project: { id: project.id, name: project.name, startDate: project.startDate },
              plantedAt: s.plantedAt,
              createdAt: s.createdAt,
            }))}
            speciesFacets={facets}
            unassignedCount={bySpecies.get(null) ?? 0}
            speciesOptions={catalog.map((c) => ({ id: c.id, commonName: c.commonName }))}
            canEdit={hasPermission(u.permissions, "sapling.update_status")}
          />
        )}
      </section>
    </div>
  );
}
