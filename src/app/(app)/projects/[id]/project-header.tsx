import { CalendarDays, Clock } from "lucide-react";
import { FormattedDate } from "@/components/formatted-date";
import { AvatarStack, ProjectStatusBadge } from "@/components/ui";
import { STRINGS } from "@/i18n/en";

/** Title + status badge + team + description + key dates + cover. */
export function ProjectHeader({
  name,
  status,
  description,
  startDate,
  createdAt,
  coverImage,
  team = [],
}: {
  name: string;
  status: string;
  description: string | null;
  startDate: string | null;
  createdAt: string | Date;
  coverImage: string | null;
  team?: string[];
}) {
  const statusLabel =
    STRINGS.projects.status[status as keyof typeof STRINGS.projects.status] ?? status;
  return (
    <header>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-ink)]" style={{ margin: 0 }}>{name}</h1>
        <ProjectStatusBadge status={status} label={statusLabel} />
        {team.length > 0 && <AvatarStack names={team} />}
      </div>
      {description && <p className="text-sm text-[var(--gs-muted)] mt-2 max-w-2xl">{description}</p>}
      <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-[var(--gs-muted)]">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} aria-hidden />
          <dt>Plantation start:</dt>
          <dd className="font-semibold text-[var(--gs-ink)]">
            <FormattedDate value={startDate} />
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} aria-hidden />
          <dt>Created:</dt>
          <dd className="font-semibold text-[var(--gs-ink)]">
            <FormattedDate value={createdAt} />
          </dd>
        </div>
      </dl>
      {coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt={`${name} cover`}
          className="rounded-3xl w-full max-h-56 object-cover mt-4"
        />
      )}
    </header>
  );
}
