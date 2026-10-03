"use client";

import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useState } from "react";
import { STRINGS } from "@/i18n/en";
import { uniqueByName } from "@/lib/species";
import type { SaplingSort, SaplingStatusFilter, SpeciesFacet } from "./types";
import { SAPLING_STATUSES } from "./types";

export interface SaplingFilterState {
  q: string;
  status: SaplingStatusFilter;
  speciesId: string;
  plantedFrom: string;
  plantedTo: string;
  regFrom: string;
  regTo: string;
  sort: SaplingSort;
}

export const EMPTY_FILTERS: SaplingFilterState = {
  q: "",
  status: "all",
  speciesId: "all",
  plantedFrom: "",
  plantedTo: "",
  regFrom: "",
  regTo: "",
  sort: "newest",
};

function statusLabel(s: string) {
  if (s === "all") return "All";
  return STRINGS.sapling.status[s as keyof typeof STRINGS.sapling.status] ?? s;
}

/** Search + species + status + dates + sort, with active-filter pills. */
export function SaplingFilters({
  filters,
  onChange,
  speciesFacets,
  unassignedCount,
  totalCount,
  statusCounts,
  matchCount,
}: {
  filters: SaplingFilterState;
  onChange: (next: SaplingFilterState) => void;
  speciesFacets: SpeciesFacet[];
  unassignedCount: number;
  totalCount: number;
  statusCounts: Record<string, number>;
  matchCount: number;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const set = (patch: Partial<SaplingFilterState>) => onChange({ ...filters, ...patch });

  const datesActive = Boolean(filters.plantedFrom || filters.plantedTo || filters.regFrom || filters.regTo);
  const activePills: { key: string; label: string; clear: () => void }[] = [];
  if (filters.q) activePills.push({ key: "q", label: `“${filters.q}”`, clear: () => set({ q: "" }) });
  if (filters.status !== "all")
    activePills.push({ key: "status", label: statusLabel(filters.status), clear: () => set({ status: "all" }) });
  if (filters.speciesId !== "all") {
    const name =
      filters.speciesId === "unassigned"
        ? "Unassigned"
        : (speciesFacets.find((f) => f.id === filters.speciesId)?.name ?? "Species");
    activePills.push({ key: "species", label: name, clear: () => set({ speciesId: "all" }) });
  }
  if (datesActive)
    activePills.push({
      key: "dates",
      label: "Dates",
      clear: () => set({ plantedFrom: "", plantedTo: "", regFrom: "", regTo: "" }),
    });

  const clearAll = () => onChange({ ...EMPTY_FILTERS, sort: filters.sort });

  return (
    <div className="gs-card p-4">
      {/* Primary row: search + species + sort */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gs-muted)] pointer-events-none"
          />
          <input
            type="search"
            aria-label="Search saplings"
            placeholder="Search code or species…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            className="w-full !pl-10 !pr-9 !py-2.5 !rounded-2xl !bg-[var(--gs-bg)] !border-none text-sm"
          />
          {filters.q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => set({ q: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--gs-muted)] hover:text-[var(--gs-ink)]"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <select
          aria-label="Filter by species"
          value={filters.speciesId}
          onChange={(e) => set({ speciesId: e.target.value })}
          className="sm:!w-52 !py-2.5 !rounded-2xl !bg-[var(--gs-bg)] !border-none text-sm font-medium"
        >
          <option value="all">All species ({totalCount})</option>
          {uniqueByName(
            speciesFacets.filter((f) => f.count > 0),
            (f) => f.name,
          ).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.count})
            </option>
          ))}
          {unassignedCount > 0 && <option value="unassigned">Unassigned ({unassignedCount})</option>}
        </select>
        <select
          aria-label="Sort saplings"
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as SaplingFilterState["sort"] })}
          className="sm:!w-40 !py-2.5 !rounded-2xl !bg-[var(--gs-bg)] !border-none text-sm font-medium"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="code">Code A-Z</option>
        </select>
      </div>

      {/* Status segmented pills with live counts */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by status">
        {SAPLING_STATUSES.map((s) => {
          const count = s === "all" ? totalCount : (statusCounts[s] ?? 0);
          const active = filters.status === s;
          return (
            <button
              key={s}
              type="button"
              className="gs-chip !py-2 shrink-0"
              aria-pressed={active}
              onClick={() => set({ status: s })}
            >
              {statusLabel(s)}{" "}
              <span className={`text-xs ${active ? "opacity-70" : "text-[var(--gs-muted)]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Advanced (dates) toggle */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        aria-expanded={advancedOpen}
        className="gs-chip mt-2 inline-flex items-center gap-1.5 !py-2"
        style={{ background: "var(--gs-ink)", color: "#fff" }}
      >
        <SlidersHorizontal size={13} aria-hidden />
        {advancedOpen ? "Hide date filters" : "Filter by dates"}
        {datesActive && !advancedOpen && (
          <span className="rounded-full bg-white text-[var(--gs-ink)] text-[0.65rem] font-bold px-1.5 py-0.5 leading-none">
            on
          </span>
        )}
      </button>
      {advancedOpen && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="text-xs font-medium">
            Planted from
            <input
              type="date"
              aria-label="Planted from"
              value={filters.plantedFrom}
              max={filters.plantedTo || undefined}
              onChange={(e) => set({ plantedFrom: e.target.value })}
              className="mt-1 w-full !rounded-2xl !py-2 !bg-[var(--gs-bg)] !border-none text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Planted to
            <input
              type="date"
              aria-label="Planted to"
              value={filters.plantedTo}
              min={filters.plantedFrom || undefined}
              onChange={(e) => set({ plantedTo: e.target.value })}
              className="mt-1 w-full !rounded-2xl !py-2 !bg-[var(--gs-bg)] !border-none text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Registered from
            <input
              type="date"
              aria-label="Registered from"
              value={filters.regFrom}
              max={filters.regTo || undefined}
              onChange={(e) => set({ regFrom: e.target.value })}
              className="mt-1 w-full !rounded-2xl !py-2 !bg-[var(--gs-bg)] !border-none text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Registered to
            <input
              type="date"
              aria-label="Registered to"
              value={filters.regTo}
              min={filters.regFrom || undefined}
              onChange={(e) => set({ regTo: e.target.value })}
              className="mt-1 w-full !rounded-2xl !py-2 !bg-[var(--gs-bg)] !border-none text-sm"
            />
          </label>
        </div>
      )}

      {/* Active-filter pills + result count */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <p className="text-xs text-[var(--gs-muted)] mr-auto" role="status">
          {matchCount} of {totalCount} match
        </p>
        {activePills.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={p.clear}
            aria-label={`Remove ${p.label} filter`}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--gs-ink)] text-white text-xs font-medium pl-2.5 pr-2 py-1"
          >
            {p.label}
            <X size={12} aria-hidden />
          </button>
        ))}
        {activePills.length > 0 && (
          <button type="button" onClick={clearAll} className="text-xs font-semibold underline underline-offset-2 inline-flex items-center gap-1">
            <RotateCcw size={12} aria-hidden />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
