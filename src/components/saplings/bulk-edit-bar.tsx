"use client";

import { CalendarDays, Check, Flag, Leaf, StickyNote, X } from "lucide-react";
import { STRINGS } from "@/i18n/en";
import { uniqueSpecies } from "@/lib/species";
import { SAPLING_STATUSES, NO_CHANGE } from "./types";
import type { SpeciesOption } from "./types";

/** Sticky bulk-edit panel for the current selection. */
export function BulkEditBar({
  selectedCount,
  speciesOptions,
  bulkSpecies,
  setBulkSpecies,
  bulkDate,
  setBulkDate,
  bulkClearDate,
  setBulkClearDate,
  bulkStatus,
  setBulkStatus,
  bulkNote,
  setBulkNote,
  applying,
  canApply,
  onApply,
  onCancel,
}: {
  selectedCount: number;
  speciesOptions: SpeciesOption[];
  bulkSpecies: string;
  setBulkSpecies: (v: string) => void;
  bulkDate: string;
  setBulkDate: (v: string) => void;
  bulkClearDate: boolean;
  setBulkClearDate: (v: boolean) => void;
  bulkStatus: string;
  setBulkStatus: (v: string) => void;
  bulkNote: string;
  setBulkNote: (v: string) => void;
  applying: boolean;
  canApply: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="sticky bottom-24 z-10 gs-card gs-float p-4 mt-4"
      role="group"
      aria-label="Bulk update selected saplings"
    >
      <p className="font-bold text-sm inline-flex items-center gap-1.5">
        <Check size={15} aria-hidden />
        Update {selectedCount} sapling{selectedCount === 1 ? "" : "s"} in one shot
      </p>
      <div className="grid sm:grid-cols-2 gap-x-3">
        <label className="text-sm font-medium mt-3 block">
          <span className="inline-flex items-center gap-1.5"><Leaf size={13} aria-hidden /> Species</span>
          <select
            aria-label="Bulk species"
            value={bulkSpecies}
            onChange={(e) => setBulkSpecies(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
          >
            <option value={NO_CHANGE}>No change</option>
            <option value="">Unassigned</option>
            {uniqueSpecies(speciesOptions).map((o) => (
              <option key={o.id} value={o.id}>
                {o.commonName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium mt-3 block">
          <span className="inline-flex items-center gap-1.5"><Flag size={13} aria-hidden /> Status</span>
          <select
            aria-label="Bulk status"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
          >
            <option value={NO_CHANGE}>No change</option>
            {SAPLING_STATUSES.filter((s) => s !== "all").map((s) => (
              <option key={s} value={s}>
                {STRINGS.sapling.status[s as keyof typeof STRINGS.sapling.status] ?? s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-sm font-medium mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={bulkClearDate}
          onChange={(e) => {
            setBulkClearDate(e.target.checked);
            if (e.target.checked) setBulkDate("");
          }}
          className="w-4 h-4 accent-[var(--gs-brand)]"
        />
        Remove plantation date
      </label>
      {!bulkClearDate && (
        <label className="text-sm font-medium mt-2 block">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden /> Plantation date</span>
          <input
            type="date"
            aria-label="Bulk plantation date"
            max={new Date().toISOString().slice(0, 10)}
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
          />
        </label>
      )}
      <p className="text-xs text-[var(--gs-muted)] mt-2">Setting a date on Registered saplings marks them Planted. Choosing the Planted status without a date stamps today.</p>
      <label className="text-sm font-medium mt-2 block">
        <span className="inline-flex items-center gap-1.5"><StickyNote size={13} aria-hidden /> Note (added to each sapling&apos;s timeline)</span>
        <input
          aria-label="Bulk note"
          placeholder="Note (optional)"
          value={bulkNote}
          onChange={(e) => setBulkNote(e.target.value)}
          className="mt-1 w-full !rounded-2xl"
        />
      </label>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className="gs-chip flex-1 justify-center inline-flex items-center gap-1.5"
          style={{ background: "var(--gs-ink)", color: "#fff" }}
          disabled={!canApply}
          onClick={onApply}
        >
          <Check size={14} aria-hidden />
          {applying ? "Updating…" : `Apply to ${selectedCount}`}
        </button>
        <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={onCancel}>
          <X size={14} aria-hidden />
          Cancel
        </button>
      </div>
    </div>
  );
}
