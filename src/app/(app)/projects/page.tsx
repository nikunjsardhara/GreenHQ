import { Archive, Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getProjectCards } from "@/lib/project-cards";
import { ProjectGrid } from "@/components/project-grid";
import { ActionLink, PageHeader } from "@/components/ui";
import { FormattedDate } from "@/components/formatted-date";
import { RestoreButton } from "@/components/restore-button";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const sp = await searchParams;
  const u = (await getCurrentUser())!;
  const orgId = u.session.orgId!;
  const canRestore = hasPermission(u.permissions, "project.delete");
  const showArchived = sp.archived === "1" && canRestore;

  const cards = await getProjectCards(orgId, showArchived);
  const rows = showArchived ? cards.filter((p) => p.deletedAt) : cards.filter((p) => !p.deletedAt);

  return (
    <div>
      <PageHeader
        title={showArchived ? "Archived projects" : "Projects"}
        subtitle={`${rows.length} total`}
        actions={
          canRestore ? (
            <ActionLink href={showArchived ? "/projects" : "/projects?archived=1"}>
              {showArchived ? "Hide archived" : "View archived"}
            </ActionLink>
          ) : undefined
        }
      />
      {showArchived ? (
        <ul className="flex flex-col gap-3">
          {rows.map((p) => (
            <li key={p.id} className="gs-card p-4 flex items-center gap-4">
              <span className="w-10 h-10 rounded-xl bg-[var(--gs-bg)] flex items-center justify-center text-[var(--gs-muted)] shrink-0" aria-hidden>
                <Archive size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[var(--gs-ink)]">{p.name}</span>
                <span className="block text-xs text-[var(--gs-muted)] mt-1">
                  Archived {p.deletedAt ? <FormattedDate value={p.deletedAt} /> : ""} · Plantation started <FormattedDate value={p.startDate} />
                </span>
              </span>
              <RestoreButton kind="project" id={p.id} />
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
              <Inbox size={15} aria-hidden />
              Nothing archived.
            </li>
          )}
        </ul>
      ) : (
        <ProjectGrid
          projects={rows}
          canCreate={hasPermission(u.permissions, "project.create")}
        />
      )}
    </div>
  );
}
