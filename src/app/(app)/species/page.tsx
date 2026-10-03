"use client";

import { useEffect, useState } from "react";
import { Globe, Leaf, Loader2, Plus, TreePine, Upload } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { trackPending } from "@/lib/pending";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/ui";

interface SpeciesRow {
  id: string;
  commonName: string;
  scientificName: string | null;
  category: string;
  co2KgPerYear: number;
  orgId: string | null;
  saplingCount: number;
}

// Species catalog, PRD §5.7: global (seeded) + org additions, CSV import.
export default function SpeciesPage() {
  const [rows, setRows] = useState<SpeciesRow[]>([]);
  const [commonName, setCommonName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [co2, setCo2] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const load = () => apiFetch<{ species: SpeciesRow[] }>("/api/species").then((r) => setRows(r.species)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    try {
      await apiFetch("/api/species", {
        method: "POST",
        body: JSON.stringify({ commonName, scientificName: scientificName || undefined, co2KgPerYear: Number(co2) || 0 }),
      });
      toast("Species added.", "success");
      setCommonName("");
      setScientificName("");
      setCo2("");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Add failed.", "error");
    } finally {
      setAdding(false);
    }
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    setImporting(true);
    try {
      const res = await trackPending(fetch("/api/species/import", { method: "PUT", body: text }));
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed");
      toast(`Imported ${body.imported} species.`, "success");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed.", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Species catalog" subtitle={`${rows.length} entries (global + org)`} />
      <ul className="flex flex-col gap-3">
        {rows.map((s) => (
          <li key={s.id} className="gs-card p-4 flex items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]" aria-hidden>
              <Leaf size={22} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[var(--gs-ink)]">
                {s.commonName}{" "}
                {s.orgId ? null : (
                  <span className="text-xs font-normal text-[var(--gs-muted)] inline-flex items-center gap-1">
                    · <Globe size={11} aria-hidden /> global
                  </span>
                )}
              </span>
              <span className="block text-xs text-[var(--gs-muted)] mt-1">{s.scientificName ?? ""} · {s.category} · {s.co2KgPerYear} kg CO₂/yr</span>
            </span>
            <span className="text-xs font-semibold whitespace-nowrap text-[var(--gs-coral)] inline-flex items-center gap-1" aria-label={`${s.saplingCount} saplings`}>
              <TreePine size={13} aria-hidden />
              {s.saplingCount} trees
            </span>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold mt-7 mb-3 text-[var(--gs-ink)] inline-flex items-center gap-2">
        <Plus size={18} aria-hidden />
        Add org species
      </h2>
      <form onSubmit={add} className="gs-card p-5 flex flex-col gap-3">
        <input aria-label="Common name" required placeholder="Common name" value={commonName} onChange={(e) => setCommonName(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <input aria-label="Scientific name" placeholder="Scientific name (optional)" value={scientificName} onChange={(e) => setScientificName(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <input aria-label="CO₂ kg per year" placeholder="CO₂ kg/year (optional)" inputMode="decimal" value={co2} onChange={(e) => setCo2(e.target.value)} className="w-full !py-3 !rounded-2xl !bg-[var(--gs-bg)] !border-none" />
        <button type="submit" disabled={adding} className="!bg-[var(--gs-ink)] !text-white !py-3 !rounded-2xl inline-flex items-center justify-center gap-1.5">{adding ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Plus size={15} aria-hidden />} {adding ? "Adding…" : "Add species"}</button>
      </form>

      <h2 className="text-xl font-bold mt-7 mb-3 text-[var(--gs-ink)] inline-flex items-center gap-2">
        <Upload size={18} aria-hidden />
        CSV import
      </h2>
      <div className="gs-card p-5">
        <p className="text-xs text-[var(--gs-muted)] mb-3">Columns: common_name, scientific_name, category, co2_kg_per_year</p>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Import species CSV"
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
            }}
          />
          {importing && <Loader2 size={16} aria-hidden className="animate-spin text-[var(--gs-brand)] shrink-0" />}
        </div>
        {importing && <p className="text-xs text-[var(--gs-muted)] mt-2">Importing…</p>}
      </div>
    </div>
  );
}
