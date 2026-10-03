"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { PageHeader } from "@/components/ui";
import type { LngLat } from "@/components/map";

const ZonePicker = dynamic(() => import("@/components/map").then((m) => m.ZonePicker), { ssr: false });

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [targetCount, setTargetCount] = useState(500);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [coverImage, setCoverImage] = useState("");
  const [ring, setRing] = useState<LngLat[] | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const zoneGeojson =
        ring && ring.length > 2 ? { type: "Polygon", coordinates: [[...ring, ring[0]]] } : undefined;
      const res = await apiFetch<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined, notes: notes.trim() || undefined, targetCount, startDate: startDate || undefined, coverImage: coverImage || undefined, zoneGeojson }),
      });
      toast("Project created.", "success");
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="New project" subtitle="Container for bulk-created saplings" />
      <form onSubmit={submit} className="gs-card p-4 flex flex-col gap-3">
        <label className="text-sm font-medium">
          Name
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full !rounded-2xl" />
        </label>
        <label className="text-sm font-medium">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full !rounded-2xl" />
        </label>
        <label className="text-sm font-medium">
          Notes (optional long-form text, soil, water, contacts, visit log)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={10000} placeholder="Soil type, water source, owner contacts…" className="mt-1 w-full !rounded-2xl" />
        </label>
        <label className="text-sm font-medium">
          Target sapling count
          <input type="number" min={0} value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))} className="mt-1 w-full !rounded-2xl" />
        </label>
        <div className="flex gap-2">
          <label className="text-sm font-medium flex-1">
            Plantation start date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full !rounded-2xl" />
          </label>
          <label className="text-sm font-medium flex-[2]">
            Cover image URL (optional)
            <input type="url" placeholder="https://…" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="mt-1 w-full !rounded-2xl" />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium mb-1 inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden />
            Zone (optional polygon)
          </p>
          <ZonePicker value={ring} onChange={setRing} />
        </div>
        <button type="submit" disabled={busy} className="!rounded-2xl inline-flex items-center justify-center gap-1.5"><FolderPlus size={15} aria-hidden />{busy ? "Creating…" : "Create project"}</button>
      </form>
    </div>
  );
}
