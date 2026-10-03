"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { apiFetch, mutateOptimistic } from "@/lib/client";
import { toast } from "@/lib/toast";
import { queueMutation } from "@/lib/outbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDay } from "@/lib/dates";
import {
  ALL_STATUSES,
  LIFECYCLE_ORDER,
  allowedTargets,
} from "@/lib/lifecycle";
import type { SaplingStatus } from "@/db/schema";
import { STRINGS } from "@/i18n/en";

const label = (s: string): string =>
  STRINGS.sapling.status[s as keyof typeof STRINGS.sapling.status] ?? s;

// Lifecycle stepper with optimistic UI, PRD §3.4 / §5.3.
// Guided moves (next stage, lost, replaced) for every editor; holders of the
// sapling.override_status permission additionally get an arbitrary picker.
export function StatusStepper({
  nanoid,
  current,
  canUpdate,
  canOverride,
}: {
  nanoid: string;
  current: string;
  canUpdate: boolean;
  canOverride: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState("");
  const [overrideTo, setOverrideTo] = useState<string>("");
  // Plantation-date dialog state: moves to "planted" pause here so the user
  // can pick the date (defaults to today) instead of silently stamping it.
  const [pendingPlant, setPendingPlant] = useState<string | null>(null);
  const [plantDate, setPlantDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!canUpdate)
    return (
      <p className="text-sm text-[var(--gs-muted)]">
        Status: <strong>{label(status)}</strong>
      </p>
    );

  const advance = async (next: string, plantedAtISO?: string) => {
    const prev = status;
    const payload = { status: next, note: note || undefined, ...(plantedAtISO ? { plantedAt: plantedAtISO } : {}) };
    try {
      await mutateOptimistic({
        apply: () => setStatus(next),
        rollback: () => setStatus(prev),
        commit: async () => {
          if (!navigator.onLine) {
            await queueMutation({ kind: "sapling-status", payload: { nanoid, ...payload } });
            toast("Offline, status change queued for sync.", "info");
            return;
          }
          await apiFetch(`/api/saplings/${nanoid}/status`, { method: "PATCH", body: JSON.stringify(payload) });
          toast(
            plantedAtISO ? `Status → ${label(next)} on ${formatDay(plantedAtISO)}.` : `Status → ${label(next)}.`,
            "success",
          );
          router.refresh();
        },
      });
    } catch {
      /* toast handled by mutateOptimistic */
    }
  };

  // Moves to "planted" go through the plantation-date dialog so the user can
  // pick the date (default today); everything else applies immediately.
  const requestAdvance = (next: string) => {
    if (next === "planted") {
      setPlantDate(today);
      setPendingPlant(next);
      return;
    }
    advance(next);
  };

  const confirmPlantDate = async () => {
    if (!pendingPlant || confirming) return;
    if (plantDate > today) {
      toast("Plantation date cannot be in the future.", "error");
      return;
    }
    setConfirming(true);
    try {
      await advance(pendingPlant, new Date(`${plantDate || today}T00:00:00`).toISOString());
      setPendingPlant(null);
    } finally {
      setConfirming(false);
    }
  };

  const from = status as SaplingStatus;
  const guided = allowedTargets(from, false);
  const orderIdx = LIFECYCLE_ORDER.indexOf(from);

  const isExceptional = status === "lost" || status === "replaced";
  const isActive = (s: string) => s === status;
  const isCompleted = (s: string) => {
    const i = LIFECYCLE_ORDER.indexOf(s as SaplingStatus);
    return orderIdx >= 0 && i >= 0 && i < orderIdx;
  };

  return (
    <div>
      <ol className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Lifecycle">
        {LIFECYCLE_ORDER.map((s, idx) => {
          const active = isActive(s);
          const completed = isCompleted(s);
          const isLast = idx === LIFECYCLE_ORDER.length - 1;
          const stepNum = idx + 1;
          return (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center relative min-w-0">
              <span
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0 border-2 z-[1]"
                style={{
                  background: completed ? "var(--gs-brand)" : active ? "var(--gs-brand)" : "#fff",
                  borderColor: completed || active ? "var(--gs-brand)" : "var(--gs-line)",
                  color: completed || active ? "#fff" : "var(--gs-muted)",
                }}
                aria-hidden
              >
                {completed ? <Check size={14} strokeWidth={3} /> : stepNum}
              </span>
              {/* connector to next circle, absolute, overlaps gap to truly connect */}
              {!isLast && (
                <>
                  <span
                    className="sm:hidden absolute top-3.5 h-0.5 left-[calc(50%_+_16px)] right-[calc(-50%_+_4px)]"
                    style={{ background: idx < orderIdx ? "var(--gs-brand)" : "var(--gs-line)" }}
                    aria-hidden
                  />
                  <span
                    className="hidden sm:block absolute top-4 h-0.5 left-[calc(50%_+_18px)] right-[calc(-50%_+_2px)]"
                    style={{ background: idx < orderIdx ? "var(--gs-brand)" : "var(--gs-line)" }}
                    aria-hidden
                  />
                </>
              )}
              <span
                className="text-[10px] sm:text-xs leading-tight font-semibold break-words max-w-full"
                style={{ color: active ? "var(--gs-ink)" : completed ? "var(--gs-ink)" : "var(--gs-muted)" }}
                aria-current={active ? "step" : undefined}
              >
                {label(s)}
              </span>
            </li>
          );
        })}
      </ol>
      {isExceptional && (
        <p className="mt-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border" style={{ background: status === "lost" ? "#fbe7e5" : "#efeafb", color: status === "lost" ? "#b3261e" : "#5b3fa8", borderColor: status === "lost" ? "#f3c1bd" : "#d8d0f0" }}>
            <span aria-hidden className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: status === "lost" ? "#d43a2f" : "#7a5fd0" }} />
            {label(status)}
          </span>
        </p>
      )}
      <div className="flex gap-2 mt-3 flex-wrap no-print" role="group" aria-label="Guided status moves">
        {guided.map((s) => (
          <button key={s} type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={() => requestAdvance(s)}>
            <ArrowRight size={14} aria-hidden />
            Mark {label(s).toLowerCase()}
          </button>
        ))}
      </div>
      {canOverride && (
        <div className="flex gap-2 mt-2 no-print">
          <select
            aria-label="Set any status (override permission)"
            value={overrideTo}
            onChange={(e) => setOverrideTo(e.target.value)}
            className="flex-1"
          >
            <option value="">Set any status…</option>
            {ALL_STATUSES.filter((s) => s !== status).map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={!overrideTo} onClick={() => overrideTo && requestAdvance(overrideTo)}>
            <Check size={14} aria-hidden />
            Apply
          </button>
        </div>
      )}
      <input
        aria-label="Status note (optional)"
        placeholder="Note for this update (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full mt-2 no-print !rounded-2xl"
      />
      <ConfirmDialog
        open={pendingPlant !== null}
        onClose={() => !confirming && setPendingPlant(null)}
        title="Mark as planted"
        confirmLabel="Mark planted"
        onConfirm={confirmPlantDate}
        busy={confirming}
      >
        <p className="text-[var(--gs-muted)]">
          When was this sapling planted? This becomes its plantation date.
        </p>
        <label className="font-medium mt-3 block">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden />
            Plantation date
          </span>
          <input
            type="date"
            aria-label="Plantation date"
            max={today}
            value={plantDate}
            onChange={(e) => setPlantDate(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
          />
        </label>
        <p className="text-xs text-[var(--gs-muted)] mt-2">Defaults to today, pick an earlier date for older plantings.</p>
      </ConfirmDialog>
    </div>
  );
}
