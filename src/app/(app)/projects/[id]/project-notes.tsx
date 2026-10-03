"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Plus, StickyNote } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SectionCard } from "@/components/ui";

const MAX_LENGTH = 10000;

/** Long-form project notes, shown by default, editable in place. */
export function ProjectNotes({
  projectId,
  initialNotes,
  canEdit,
}: {
  projectId: string;
  initialNotes: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const openDialog = () => {
    setDraft(notes);
    setDialogOpen(true);
  };

  const save = async () => {
    const next = draft.trim() ? draft.trim() : null;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: next }),
      });
      setNotes(next ?? "");
      setDialogOpen(false);
      toast(next ? "Project notes saved." : "Project notes cleared.", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Notes update failed.", "error");
    } finally {
      setBusy(false);
    }
  };
  const changed = (draft.trim() ? draft.trim() : null) !== (notes ? notes : null);

  return (
    <>
      <SectionCard
        title="Project notes"
        subtitle={notes ? "Field observations, contacts, visit log" : "No notes yet"}
        action={
          canEdit ? (
            <button
              type="button"
              className="gs-chip inline-flex items-center gap-1.5 !py-2"
              onClick={openDialog}
            >
              {notes ? <PencilLine size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
              {notes ? "Edit" : "Add notes"}
            </button>
          ) : undefined
        }
      >
        {notes ? (
          <p className="text-sm text-[var(--gs-ink)] whitespace-pre-wrap leading-relaxed">{notes}</p>
        ) : (
          <p className="text-sm text-[var(--gs-muted)] inline-flex items-start gap-1.5">
            <StickyNote size={15} aria-hidden className="mt-0.5 shrink-0" />
            No notes yet, record soil, water, owner contacts, or visit logs here.
          </p>
        )}
      </SectionCard>
      {canEdit && (
        <ConfirmDialog
          open={dialogOpen}
          onClose={() => !busy && setDialogOpen(false)}
          title={notes ? "Edit project notes" : "Add project notes"}
          confirmLabel="Save notes"
          onConfirm={save}
          busy={busy}
          confirmDisabled={!changed}
        >
          <label className="font-medium block">
            Notes (long-form text)
            <textarea
              aria-label="Project notes"
              rows={8}
              maxLength={MAX_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Soil type, water source, owner contacts, visit log…"
              className="mt-1 w-full !rounded-2xl"
            />
          </label>
          <p className="text-xs text-[var(--gs-muted)] mt-1">
            {draft.length}/{MAX_LENGTH} · clear the text and save to remove notes.
          </p>
          {!changed && !busy && (
            <p className="text-xs text-[var(--gs-muted)] mt-2">No changes yet.</p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
