"use client";

import Link from "next/link";
import { Sprout, CalendarDays, PackagePlus } from "lucide-react";
import { STRINGS } from "@/i18n/en";
import { effectivePlantedAt } from "@/lib/dates";
import { FormattedDate } from "../formatted-date";
import { SaplingStatusBadge } from "../ui";
import type { SaplingRow } from "./types";

/** Single sapling row, selection checkbox + identity + badges + dates. */
export function SaplingCard({
  sapling,
  canEdit,
  checked,
  onToggle,
}: {
  sapling: SaplingRow;
  canEdit: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const statusLabel =
    STRINGS.sapling.status[sapling.status as keyof typeof STRINGS.sapling.status] ?? sapling.status;
  // Own planted date, else the project's plantation-start date, so a real
  // date shows instead of a dash. Only when neither exists do we show the
  // Registered date (createdAt is always set, so no dash is possible).
  const planted = effectivePlantedAt(sapling.plantedAt, sapling.project?.startDate);
  return (
    <div className="gs-card p-4 flex items-center gap-3">
      {canEdit && (
        <input
          type="checkbox"
          aria-label={`Select sapling ${sapling.nanoid}`}
          checked={checked}
          onChange={onToggle}
          className="w-5 h-5 shrink-0 accent-[var(--gs-brand)]"
        />
      )}
      <Link href={`/saplings/${sapling.nanoid}`} className="flex items-center gap-3.5 flex-1 min-w-0">
        <span
          className="w-12 h-12 rounded-2xl bg-[var(--gs-mint-light)] flex items-center justify-center shrink-0 text-[var(--gs-brand)]"
          aria-hidden
        >
          <Sprout size={22} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-sm font-semibold text-[var(--gs-ink)]">{sapling.nanoid}</span>
            <SaplingStatusBadge status={sapling.status} label={statusLabel} />
          </span>
          <span className="block text-xs text-[var(--gs-muted)] mt-1.5 truncate">
            {sapling.species?.commonName ?? "Unassigned species"}
            {sapling.project ? ` · ${sapling.project.name}` : ""}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--gs-muted)] mt-1">
            {planted ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} aria-hidden />
                Planted <FormattedDate value={planted} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <PackagePlus size={12} aria-hidden />
                Registered <FormattedDate value={sapling.createdAt} />
              </span>
            )}
          </span>
        </span>
      </Link>
    </div>
  );
}
