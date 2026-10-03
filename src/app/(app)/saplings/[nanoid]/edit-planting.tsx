"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Save } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { uniqueSpecies } from "@/lib/species";
import { toast } from "@/lib/toast";

// Single-sapling correction of species + plantation date, reusing the
// one-shot bulk-update endpoint with a one-item selection.
export function EditPlanting({
  nanoid,
  currentSpeciesId,
  plantedAt,
  canEdit,
}: {
  nanoid: string;
  currentSpeciesId: string | null;
  plantedAt: string | Date | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<{ id: string; commonName: string }[]>([]);
  const [speciesId, setSpeciesId] = useState<string>(currentSpeciesId ?? "");
  const [date, setDate] = useState(plantedAt ? new Date(plantedAt).toISOString().slice(0, 10) : "");
  const [clearDate, setClearDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canEdit) return;
    apiFetch<{ species: { id: string; commonName: string }[] }>("/api/species")
      .then((r) => setOptions(r.species))
      .catch(() => {});
  }, [canEdit]);

  if (!canEdit) return null;

  const toISODate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
  const speciesChanged = speciesId !== (currentSpeciesId ?? "");
  const dateChanged = clearDate ? plantedAt != null : date !== (plantedAt ? toISODate(plantedAt) : "");
  const canSave = (speciesChanged || dateChanged) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const body: { nanoids: string[]; speciesId?: string | null; plantedAt?: string | null } = {
        nanoids: [nanoid],
      };
      if (speciesChanged) body.speciesId = speciesId === "" ? null : speciesId;
      if (clearDate) body.plantedAt = null;
      else if (date !== (plantedAt ? toISODate(plantedAt) : ""))
        body.plantedAt = new Date(`${date}T00:00:00`).toISOString();
      await apiFetch("/api/saplings/bulk-update", { method: "PATCH", body: JSON.stringify(body) });
      toast("Sapling updated.", "success");
      setClearDate(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gs-card p-4 mt-3 no-print">
      <h3 className="font-bold text-sm inline-flex items-center gap-1.5">
        <PencilLine size={14} aria-hidden />
        Edit species & plantation date
      </h3>
      <label className="text-sm font-medium mt-3 block">
        Species
        <select aria-label="Species" value={speciesId} onChange={(e) => setSpeciesId(e.target.value)} className="mt-1 w-full !rounded-2xl">
          <option value="">Unassigned</option>
          {uniqueSpecies(options).map((o) => (
            <option key={o.id} value={o.id}>{o.commonName}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium mt-2 flex items-center gap-2">
        <input type="checkbox" checked={clearDate} onChange={(e) => { setClearDate(e.target.checked); if (e.target.checked) setDate(""); }} className="w-4 h-4" />
        Remove plantation date
      </label>
      {!clearDate && (
        <label className="text-sm font-medium mt-2 block">
          Plantation date
          <input
            type="date"
            aria-label="Plantation date"
            max={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full !rounded-2xl"
          />
        </label>
      )}
      <button
        type="button"
        className="gs-chip mt-3 inline-flex items-center gap-1.5"
        style={{ background: "var(--gs-ink)", color: "#fff" }}
        disabled={!canSave}
        onClick={save}
      >
        <Save size={14} aria-hidden />
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
