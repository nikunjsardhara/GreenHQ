"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, QrCode, CalendarDays } from "lucide-react";
import { AvatarStack, ActionLink, ProgressBar, ProjectStatusBadge } from "./ui";
import { FormattedDate } from "./formatted-date";
import { STRINGS } from "@/i18n/en";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  targetCount: number;
  saplingCount: number;
  team?: string[];
  zoneNames?: string[];
  startDate?: string | null;
}

const FILTERS = ["all", "active", "planning", "completed", "archived"] as const;

// Bento project cards with search + pill filters by status and zone (PRD §8
// home dashboard), team avatar-stacks, Continue / Bulk Create actions.
export function ProjectGrid({ projects, canCreate }: { projects: ProjectCardData[]; canCreate: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [zone, setZone] = useState<string>("all");

  const allZones = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) for (const z of p.zoneNames ?? []) set.add(z);
    return [...set].sort();
  }, [projects]);

  const visible = useMemo(
    () =>
      projects.filter(
        (p) =>
          (filter === "all" || p.status === filter) &&
          (zone === "all" || (p.zoneNames ?? []).includes(zone)) &&
          (!q || `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [projects, q, filter, zone],
  );

  return (
    <div>
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={18} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gs-muted)]" />
          <input
            type="search"
            role="searchbox"
            aria-label="Search projects"
            placeholder={STRINGS.home.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full !pl-11 !py-3 !rounded-2xl !bg-white !border-none !shadow-sm"
          />
        </div>
        {canCreate && (
          <Link href="/projects/new" className="gs-chip no-print inline-flex items-center gap-1.5 !bg-[var(--gs-ink)] !text-white !px-5 !py-3">
            <Plus size={16} aria-hidden /> New
          </Link>
        )}
      </div>

      <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1 no-print" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} className="gs-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STRINGS.projects.status[f as keyof typeof STRINGS.projects.status]}
          </button>
        ))}
      </div>
      {allZones.length > 0 && (
        <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 no-print" role="group" aria-label="Filter by zone">
          <button className="gs-chip" aria-pressed={zone === "all"} onClick={() => setZone("all")}>All zones</button>
          {allZones.map((z) => (
            <button key={z} className="gs-chip" aria-pressed={zone === z} onClick={() => setZone(z)}>
              {z}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 mt-5 sm:grid-cols-2">
        {visible.map((p) => (
          <article key={p.id} className="gs-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-lg leading-snug" style={{ margin: 0 }}>
                <Link href={`/projects/${p.id}`}>{p.name}</Link>
              </h3>
              <span className="shrink-0 flex items-center gap-2">
                {p.team && p.team.length > 0 && <AvatarStack names={p.team} />}
                <ProjectStatusBadge
                  status={p.status}
                  label={STRINGS.projects.status[p.status as keyof typeof STRINGS.projects.status] ?? p.status}
                />
              </span>
            </div>
            {p.description && <p className="text-sm text-[var(--gs-muted)] mt-2 line-clamp-2">{p.description}</p>}
            <p className="text-xs text-[var(--gs-muted)] mt-2 inline-flex items-center gap-1">
              <CalendarDays size={12} aria-hidden />
              Plantation starts: <FormattedDate value={p.startDate} />
            </p>
            <div className="mt-4">
              <ProgressBar
                value={p.targetCount > 0 ? (p.saplingCount / p.targetCount) * 100 : 0}
                label={`${p.saplingCount}${p.targetCount > 0 ? ` / ${p.targetCount}` : ""} ${STRINGS.home.saplings}`}
              />
            </div>
            <div className="flex gap-4 mt-4 no-print items-center">
              <ActionLink href={`/projects/${p.id}`}>{STRINGS.home.continue}</ActionLink>
              <Link href={`/projects/${p.id}/bulk`} className="gs-chip text-sm inline-flex items-center gap-1.5">
                <QrCode size={14} aria-hidden /> {STRINGS.home.bulkCreate}
              </Link>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="text-sm text-[var(--gs-muted)] mt-6 text-center">No projects match. Try a different search or filter.</p>
      )}
    </div>
  );
}
