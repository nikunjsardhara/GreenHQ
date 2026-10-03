import Link from "next/link";
import { Suspense } from "react";
import { FolderKanban, Sprout } from "lucide-react";
import { getDb } from "@/db";
import { OrgLogo } from "@/components/org-logo";
import { ActionLink } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { DashboardProjects, ProjectsSkeleton } from "@/components/dashboard-projects";
import { DashboardStats, StatsSkeleton } from "@/components/dashboard-stats";

// Super-admin overview is rare, so keep it behind its own Suspense so it
// never blocks the normal user's path.
async function PlatformOverview() {
  const orgs = await getDb().query.organizations.findMany({ limit: 50 });
  return (
    <div>
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <p className="text-sm text-[var(--gs-muted)]">{orgs.length} organizations on this deployment.</p>
      <div className="grid gap-3 mt-4 sm:grid-cols-2">
        {orgs.map((o) => (
          <article key={o.id} className="gs-card p-4">
            <div className="flex items-center gap-3">
              <OrgLogo name={o.name} logoUrl={o.logoUrl} size={40} rounded="rounded-2xl" />
              <div className="min-w-0">
                <h3 className="font-bold truncate">
                  <Link href={`/admin?orgId=${o.id}`}>{o.name}</Link>
                </h3>
                <p className="text-xs text-[var(--gs-muted)]">
                  {o.slug} · {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <ActionLink href="/admin">Open admin</ActionLink>
    </div>
  );
}

function PlatformSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <div className="h-6 w-40 rounded-full bg-[var(--gs-line)] animate-pulse" />
      <div className="h-4 w-64 rounded-full bg-[var(--gs-line)] animate-pulse" />
      <div className="gs-card p-4 h-16 animate-pulse bg-[var(--gs-line)]" />
    </div>
  );
}

// Dashboard shell: heading paints synchronously (zero DB). Stats and project
// grid stream in independently. First paint after login is just heading +
// skeletons, then each section fills as its 2-query batch resolves.
export function Dashboard({ user: u }: { user: CurrentUser }) {
  if (u.session.isSuperAdmin && !u.session.orgId) {
    return (
      <Suspense fallback={<PlatformSkeleton />}>
        <PlatformOverview />
      </Suspense>
    );
  }

  const orgId = u.session.orgId!;

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--gs-ink)] mb-5 inline-flex items-center gap-2.5">
        <span className="w-11 h-11 rounded-2xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]" aria-hidden>
          <Sprout size={24} />
        </span>
        Let&apos;s Plant Trees!
      </h1>

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats orgId={orgId} />
      </Suspense>

      <div className="flex items-center justify-between mt-7 mb-4">
        <h2 className="text-xl font-bold text-[var(--gs-ink)] inline-flex items-center gap-2">
          <FolderKanban size={19} aria-hidden />
          Projects
        </h2>
      </div>

      <Suspense fallback={<ProjectsSkeleton />}>
        <DashboardProjects user={u} />
      </Suspense>
    </div>
  );
}
