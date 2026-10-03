"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, SearchX } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { EmptyState, Pagination } from "./ui";
import { SaplingCard } from "./saplings/sapling-card";
import { EMPTY_FILTERS, SaplingFilters, type SaplingFilterState } from "./saplings/sapling-filters";
import { BulkEditBar } from "./saplings/bulk-edit-bar";
import { NO_CHANGE, PAGE_SIZE } from "./saplings/types";
import type { SaplingRow, SpeciesFacet, SpeciesOption } from "./saplings/types";

export type { SaplingRow, SpeciesFacet, SpeciesOption };

// Inclusive day-range match on YYYY-MM-DD inputs (local days).
function inDayRange(value: string | Date | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return false;
  if (from) {
    const start = new Date(`${from}T00:00:00`).getTime();
    if (t < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000 - 1;
    if (t > end) return false;
  }
  return true;
}

export function SaplingList({
  saplings,
  speciesFacets,
  unassignedCount,
  speciesOptions = [],
  canEdit = false,
  pageSize = PAGE_SIZE,
}: {
  saplings: SaplingRow[];
  speciesFacets: SpeciesFacet[];
  unassignedCount: number;
  speciesOptions?: SpeciesOption[];
  canEdit?: boolean;
  pageSize?: number;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<SaplingFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSpecies, setBulkSpecies] = useState<string>(NO_CHANGE);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkClearDate, setBulkClearDate] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>(NO_CHANGE);
  const [bulkNote, setBulkNote] = useState("");
  const [applying, setApplying] = useState(false);
  // The bulk panel ("dialog") opens only via the Make changes button, 
  // selecting checkboxes alone never pops it open.
  const [bulkOpen, setBulkOpen] = useState(false);

  // Live status counts (unfiltered by status) for the segmented pills.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of saplings) counts[s.status] = (counts[s.status] ?? 0) + 1;
    return counts;
  }, [saplings]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const rows = saplings.filter(
      (s) =>
        (filters.status === "all" || s.status === filters.status) &&
        (filters.speciesId === "all" ||
          (filters.speciesId === "unassigned" ? s.species === null : s.species?.id === filters.speciesId)) &&
        (!q ||
          s.nanoid.toLowerCase().includes(q) ||
          (s.species?.commonName ?? "").toLowerCase().includes(q)) &&
        inDayRange(s.plantedAt, filters.plantedFrom, filters.plantedTo) &&
        inDayRange(s.createdAt, filters.regFrom, filters.regTo),
    );
    const sorted = [...rows];
    if (filters.sort === "code") sorted.sort((a, b) => a.nanoid.localeCompare(b.nanoid));
    else if (filters.sort === "oldest")
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [saplings, filters]);

  // Filter changes always jump back to page 1; page is additionally
  // clamped via safePage when the underlying data shrinks.
  const updateFilters = (next: SaplingFilterState) => {
    setFilters(next);
    setPage(1);
  };

  // Selection pruned lazily against the current filtered set (no effect).
  const validIds = useMemo(() => new Set(filtered.map((s) => s.nanoid)), [filtered]);
  const selectedValid = useMemo(
    () => new Set([...selected].filter((id) => validIds.has(id))),
    [selected, validIds],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const changePage = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
    document.getElementById("sapling-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const allVisibleSelected = pageItems.length > 0 && pageItems.every((s) => selected.has(s.nanoid));

  const toggleOne = (nanoid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nanoid)) next.delete(nanoid);
      else next.add(nanoid);
      return next;
    });

  const toggleSelectPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const s of pageItems) next.delete(s.nanoid);
      } else {
        for (const s of pageItems) next.add(s.nanoid);
      }
      return next;
    });

  const exitSelectMode = () => {
    setSelected(new Set());
    setBulkSpecies(NO_CHANGE);
    setBulkDate("");
    setBulkClearDate(false);
    setBulkStatus(NO_CHANGE);
    setBulkNote("");
    setBulkOpen(false);
  };

  const speciesChange = bulkSpecies !== NO_CHANGE;
  const dateChange = bulkClearDate || bulkDate !== "";
  const statusChange = bulkStatus !== NO_CHANGE;
  const noteChange = bulkNote.trim() !== "";
  const canApply = selectedValid.size > 0 && (speciesChange || dateChange || statusChange || noteChange) && !applying;

  const applyBulk = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      const body: { nanoids: string[]; speciesId?: string | null; plantedAt?: string | null; status?: string; note?: string } = {
        nanoids: [...selectedValid],
      };
      if (speciesChange) body.speciesId = bulkSpecies === "" ? null : bulkSpecies;
      if (bulkClearDate) body.plantedAt = null;
      else if (bulkDate) body.plantedAt = new Date(`${bulkDate}T00:00:00`).toISOString();
      if (statusChange) body.status = bulkStatus;
      if (noteChange) body.note = bulkNote.trim();
      const res = await apiFetch<{ updated: number; statusChanged: number; transitionedToPlanted: number; skipped: { nanoid: string; reason: string }[]; unknown: string[] }>(
        "/api/saplings/bulk-update",
        { method: "PATCH", body: JSON.stringify(body) },
      );
      const bits = [`${res.updated} sapling${res.updated === 1 ? "" : "s"} updated`];
      if (res.statusChanged) bits.push(`${res.statusChanged} status changed`);
      if (res.transitionedToPlanted) bits.push(`${res.transitionedToPlanted} marked planted`);
      if (res.skipped.length) bits.push(`${res.skipped.length} skipped (needs override permission)`);
      if (res.unknown.length) bits.push(`${res.unknown.length} not found`);
      toast(`${bits.join(" · ")}.`, res.skipped.length || res.unknown.length ? "info" : "success");
      exitSelectMode();
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Bulk update failed.", "error");
    } finally {
      setApplying(false);
    }
  };

  const rangeLabel =
    filtered.length === 0
      ? "No results"
      : `Showing ${start + 1}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`;

  return (
    <div>
      <SaplingFilters
        filters={filters}
        onChange={updateFilters}
        speciesFacets={speciesFacets}
        unassignedCount={unassignedCount}
        totalCount={saplings.length}
        statusCounts={statusCounts}
        matchCount={filtered.length}
      />

      {canEdit && filtered.length > 0 && (
        <div className="gs-card px-4 py-3 mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium flex-1 min-w-0">
            <input
              type="checkbox"
              aria-label="Select all saplings on this page"
              checked={allVisibleSelected}
              onChange={toggleSelectPage}
              className="w-5 h-5 accent-[var(--gs-brand)]"
            />
            <span className="truncate">
              {selectedValid.size === 0
                ? `Select page (${pageItems.length})`
                : `${selectedValid.size} selected across filters`}
            </span>
          </label>
          {selectedValid.size > 0 && (
            <>
              <button
                type="button"
                className="gs-chip !py-1.5 shrink-0 inline-flex items-center gap-1.5"
                style={{ background: "var(--gs-ink)", color: "#fff" }}
                onClick={() => setBulkOpen(true)}
              >
                <PencilLine size={14} aria-hidden />
                Make changes
              </button>
              <button
                type="button"
                className="gs-chip !py-1.5 shrink-0"
                onClick={() => {
                  setSelected(new Set());
                  setBulkOpen(false);
                }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

      <div id="sapling-results" className="scroll-mt-24">
        {pageItems.length === 0 ? (
          <EmptyState
            title="No saplings match"
            hint="Try a different search, status, species, or date range."
            icon={<SearchX size={22} aria-hidden />}
            action={
              <button
                type="button"
                className="gs-chip"
                onClick={() => updateFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3 mt-4 list-none pl-0">
            {pageItems.map((s) => (
              <li key={s.nanoid}>
                <SaplingCard sapling={s} canEdit={canEdit} checked={selected.has(s.nanoid)} onToggle={() => toggleOne(s.nanoid)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onChange={changePage} rangeLabel={rangeLabel} />

      {canEdit && bulkOpen && selectedValid.size > 0 && (
        <BulkEditBar
          selectedCount={selectedValid.size}
          speciesOptions={speciesOptions}
          bulkSpecies={bulkSpecies}
          setBulkSpecies={setBulkSpecies}
          bulkDate={bulkDate}
          setBulkDate={setBulkDate}
          bulkClearDate={bulkClearDate}
          setBulkClearDate={setBulkClearDate}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          bulkNote={bulkNote}
          setBulkNote={setBulkNote}
          applying={applying}
          canApply={canApply}
          onApply={applyBulk}
          onCancel={exitSelectMode}
        />
      )}
    </div>
  );
}
