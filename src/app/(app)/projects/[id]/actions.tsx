"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, Download, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { trackPending } from "@/lib/pending";
import { toast } from "@/lib/toast";
import { formatDay } from "@/lib/dates";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormattedDate } from "@/components/formatted-date";
import { STRINGS } from "@/i18n/en";

const STATUSES = ["planning", "active", "completed", "archived"] as const;

/** Status control + plantation-date dialog + export / archive (client-side). */
export function ProjectActions({
  projectId,
  currentStatus,
  currentStartDate,
  canEdit,
}: {
  projectId: string;
  currentStatus: string;
  currentStartDate: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [startDate, setStartDate] = useState(currentStartDate ?? "");
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [removeDate, setRemoveDate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await trackPending(fetch(`/api/projects/${projectId}/export?format=csv`));
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `project-${projectId}-saplings.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("CSV downloaded.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed.", "error");
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Archive (soft-delete) this project? Admins can restore it from Projects → View archived.")) return;
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      toast("Project archived.", "success");
      router.push("/projects");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed.", "error");
    }
  };

  const setProjectStatus = async (next: string) => {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast(`Project → ${next}.`, "success");
      router.refresh();
    } catch (err) {
      setStatus(prev);
      toast(err instanceof Error ? err.message : "Status update failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const openStartDateDialog = () => {
    setDraftDate(startDate);
    setRemoveDate(false);
    setDialogOpen(true);
  };

  const saveStartDate = async () => {
    const next = removeDate ? null : draftDate || null;
    if (!removeDate && next && next > today) {
      toast("Plantation start date cannot be in the future.", "error");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ startDate: next }) });
      setStartDate(next ?? "");
      setDialogOpen(false);
      toast(next ? `Plantation starts ${formatDay(next)}.` : "Plantation start date removed.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Start date update failed.", "error");
    } finally {
      setBusy(false);
    }
  };
  const startDateChanged = removeDate ? startDate !== "" : draftDate !== startDate;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <label className="gs-chip inline-flex items-center gap-2 !py-2" title="Project status">
            <span className="text-xs text-[var(--gs-muted)]">Status</span>
            <select
              aria-label="Project status"
              value={status}
              disabled={busy}
              onChange={(e) => setProjectStatus(e.target.value)}
              className="!w-auto !p-0 !border-none !shadow-none !bg-transparent text-xs font-semibold focus:ring-0"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STRINGS.projects.status[s as keyof typeof STRINGS.projects.status]}
                </option>
              ))}
            </select>
          </label>
        )}
        {canEdit && (
          <button
            type="button"
            className="gs-chip inline-flex items-center gap-1.5 !py-2"
            onClick={openStartDateDialog}
            title="Change plantation date"
          >
            <CalendarDays size={14} aria-hidden /> Plantation date
          </button>
        )}
        <button
          type="button"
          className="gs-chip inline-flex items-center gap-1.5 !py-2"
          onClick={exportCsv}
          disabled={exporting}
          title="Download saplings as CSV"
        >
          {exporting ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <Download size={14} aria-hidden />} {exporting ? "Exporting…" : "Export"}
        </button>
        <button
          type="button"
          className="gs-chip inline-flex items-center gap-1.5 !py-2"
          onClick={remove}
          title="Archive this project"
        >
          <Archive size={14} aria-hidden /> Archive
        </button>
      </div>
      {canEdit && (
        <ConfirmDialog
          open={dialogOpen}
          onClose={() => !busy && setDialogOpen(false)}
          title="Update plantation start date"
          confirmLabel="Save date"
          onConfirm={saveStartDate}
          busy={busy}
          confirmDisabled={!startDateChanged}
        >
          <p className="text-[var(--gs-muted)]">
            Currently: <strong className="text-[var(--gs-ink)]">{startDate ? <FormattedDate value={startDate} /> : "not set"}</strong>
          </p>
          <div role="note" aria-label="Warning" className="mt-3 rounded-2xl p-3 text-[0.8rem] leading-snug" style={{ background: "var(--gs-yellow-light)", border: "1px solid var(--gs-yellow)" }}>
            <strong>Warning:</strong> this date is shown wherever the project appears, project cards, sapling rows, the public sapling page and printed QR sheets. Changing it rewrites that history display. Individual sapling plantation dates are not affected.
          </div>
          <label className="font-medium mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={removeDate}
              onChange={(e) => setRemoveDate(e.target.checked)}
              className="w-4 h-4"
            />
            Remove the plantation start date
          </label>
          {!removeDate && (
            <label className="font-medium mt-2 block">
              New plantation start date
              <input
                type="date"
                aria-label="New plantation start date"
                max={today}
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="mt-1 w-full !rounded-2xl"
              />
            </label>
          )}
          {!startDateChanged && !busy && (
            <p className="text-xs text-[var(--gs-muted)] mt-2">No changes yet, pick a date or remove the current one.</p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
