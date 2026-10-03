"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FolderKanban, Leaf, Loader2, LocateFixed, MapPin, Plus, Printer, QrCode, X } from "lucide-react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { apiFetch } from "@/lib/client";
import { uniqueSpecies } from "@/lib/species";
import { toast } from "@/lib/toast";
import { ActionLink, PageHeader } from "@/components/ui";
import { FormattedDate } from "@/components/formatted-date";
import { QrCaption } from "@/components/qr-caption";
import { STRINGS } from "@/i18n/en";

const PinPicker = dynamic(() => import("@/components/map").then((m) => m.PinPicker), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

interface Project { id: string; name: string; startDate: string | null; zoneGeojson: { coordinates?: unknown } | null }
interface Species { id: string; commonName: string; scientificName: string | null }
interface CreatedSapling {
  id: string;
  nanoid: string;
  url: string;
  status: string;
  orgName: string | null;
  speciesName: string | null;
  plantedAt: string | null;
  createdAt: string;
}

type LocationMode = "blank" | "single" | "zone-scatter";

const STEPS = STRINGS.bulk.steps;

// Bulk creation wizard (PRD section 5.4): project, species mix, location strategy,
// quantity → printable QR sheet + CSV.
export default function BulkWizardPage() {
  const { id: routeProjectId } = useParams<{ id: string }>();
  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(routeProjectId);
  const [species, setSpecies] = useState<Species[]>([]);
  const [mix, setMix] = useState<{ speciesId: string | null; quantity: number }[]>([{ speciesId: null, quantity: 50 }]);
  const [mode, setMode] = useState<LocationMode>("blank");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; saplings: CreatedSapling[] } | null>(null);
  const [plantedDate, setPlantedDate] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    apiFetch<{ projects: Project[] }>("/api/projects").then((r) => setProjects(r.projects)).catch(() => {});
    apiFetch<{ species: Species[] }>("/api/species").then((r) => setSpecies(r.species)).catch(() => {});
  }, []);

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const total = useMemo(() => mix.reduce((n, m) => n + (Number(m.quantity) || 0), 0), [mix]);

  const useGps = () => {
    if (!navigator.geolocation) return toast("Geolocation unavailable. Enter coordinates manually.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        toast(`GPS locked (±${Math.round(pos.coords.accuracy)} m). Confirm on the map at planting.`, "success");
        setLocating(false);
      },
      () => {
        toast("GPS failed. You can always pin manually.", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const createProjectInline = async () => {
    if (newProjectName.trim().length < 2) return toast("Project name needs 2+ characters.", "error");
    setCreatingProject(true);
    try {
      const res = await apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      setProjects((ps) => [...ps, res.project]);
      setProjectId(res.project.id);
      setNewProjectName("");
      toast("Project created.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed.", "error");
    } finally {
      setCreatingProject(false);
    }
  };

  const canNext =
    (step === 0 && !!projectId) ||
    (step === 1 && total >= 1 && total <= 2000 && mix.every((m) => m.quantity >= 1)) ||
    (step === 2 && (mode !== "single" || (lat !== "" && lng !== ""))) ||
    step === 3;

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        items: mix.map((m) => ({ speciesId: m.speciesId, quantity: Number(m.quantity) })),
        location:
          mode === "single"
            ? { mode, lat: Number(lat), lng: Number(lng) }
            : { mode },
        ...(plantedDate ? { plantedAt: new Date(`${plantedDate}T00:00:00`).toISOString() } : {}),
      };
      const res = await apiFetch<{ created: number; saplings: CreatedSapling[] }>(
        `/api/projects/${projectId}/bulk`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setResult(res);
      setStep(4);
      toast(`Created ${res.created} saplings with QR codes.`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Bulk create failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={STRINGS.bulk.title} subtitle={`Step ${Math.min(step + 1, 5)} of 5 · ${STEPS[Math.min(step, 4)]}`} />

      <ol className="flex gap-1 mb-4 no-print" aria-label="Wizard progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <span
              className="block h-1.5 rounded-full"
              style={{ background: i <= step ? "var(--gs-brand)" : "var(--gs-line)" }}
              aria-hidden
            />
            <span className="text-[0.65rem] text-[var(--gs-muted)]">{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="gs-card p-4">
          <h2 className="font-bold mb-2 inline-flex items-center gap-1.5">
            <FolderKanban size={16} aria-hidden />
            1 · Select project
          </h2>
          <select aria-label="Project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full !rounded-2xl">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <input
              aria-label="New project name"
              placeholder="…or create a new project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 !rounded-2xl"
            />
            <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={creatingProject} onClick={createProjectInline}>
              {creatingProject ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <Plus size={14} aria-hidden />}
              {creatingProject ? "Creating…" : "Create"}
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="gs-card p-4">
          <h2 className="font-bold mb-2 inline-flex items-center gap-1.5">
            <Leaf size={16} aria-hidden />
            2 · Species mix
          </h2>
          {mix.map((row, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select
                aria-label={`Species row ${i + 1}`}
                value={row.speciesId ?? ""}
                onChange={(e) => setMix((m) => m.map((r, j) => (j === i ? { ...r, speciesId: e.target.value || null } : r)))}
                className="flex-1 !rounded-2xl"
              >
                <option value="">Unassigned species</option>
                {uniqueSpecies(species).map((s) => (
                  <option key={s.id} value={s.id}>{s.commonName}{s.scientificName ? ` (${s.scientificName})` : ""}</option>
                ))}
              </select>
              <input
                type="number"
                aria-label={`Quantity row ${i + 1}`}
                min={1}
                max={2000}
                value={row.quantity}
                onChange={(e) => setMix((m) => m.map((r, j) => (j === i ? { ...r, quantity: Number(e.target.value) } : r)))}
                className="w-24 !rounded-2xl"
              />
              <button type="button" className="gs-chip" aria-label={`Remove row ${i + 1}`} onClick={() => setMix((m) => m.filter((_, j) => j !== i))} disabled={mix.length <= 1}><X size={14} aria-hidden /></button>
            </div>
          ))}
          <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={() => setMix((m) => [...m, { speciesId: null, quantity: 10 }])}>
            <Plus size={14} aria-hidden />
            Add species row
          </button>
          <p className="text-sm mt-2">Total: <strong>{total}</strong> saplings (max 2000 per batch).</p>
        </section>
      )}

      {step === 2 && (
        <section className="gs-card p-4">
          <h2 className="font-bold mb-2 inline-flex items-center gap-1.5">
            <MapPin size={16} aria-hidden />
            3 · Location strategy
          </h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Location strategy">
            <label className="gs-card p-3 flex gap-2 items-start">
              <input type="radio" name="loc" checked={mode === "blank"} onChange={() => setMode("blank")} />
              <span><strong>Blank</strong>: fill GPS per sapling later during field activation scans.</span>
            </label>
            <label className="gs-card p-3 flex gap-2 items-start">
              <input type="radio" name="loc" checked={mode === "single"} onChange={() => setMode("single")} />
              <span><strong>Single point</strong>: one GPS/pin applied to the whole batch.</span>
            </label>
            <label className="gs-card p-3 flex gap-2 items-start">
              <input type="radio" name="loc" checked={mode === "zone-scatter"} onChange={() => setMode("zone-scatter")} disabled={!project?.zoneGeojson?.coordinates} />
              <span><strong>Zone scatter</strong>: auto-scatter points inside the project polygon{!project?.zoneGeojson?.coordinates && " (project has no zone yet)"}.</span>
            </label>
          </div>
          {mode === "single" && (
            <>
              <div className="flex gap-2 mt-3">
                <input placeholder="Latitude" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className="flex-1 !rounded-2xl" aria-label="Latitude" />
                <input placeholder="Longitude" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className="flex-1 !rounded-2xl" aria-label="Longitude" />
                <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={locating} onClick={useGps}>{locating ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <LocateFixed size={14} aria-hidden />} {locating ? "Locating…" : "Use GPS"}</button>
              </div>
              <div className="mt-2">
                <PinPicker
                  value={lat !== "" && lng !== "" ? { lat: Number(lat), lng: Number(lng) } : null}
                  onChange={(p) => {
                    setLat(String(Number(p.lat.toFixed(6))));
                    setLng(String(Number(p.lng.toFixed(6))));
                  }}
                />
              </div>
            </>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="gs-card p-4">
          <h2 className="font-bold mb-2">4 · Review</h2>
          <dl className="text-sm flex flex-col gap-1">
            <div className="flex justify-between"><dt>Project</dt><dd className="font-semibold">{project?.name}{project?.startDate ? (<> (plantation starts <FormattedDate value={project.startDate} />)</>) : ""}</dd></div>
            <div className="flex justify-between"><dt>Total saplings</dt><dd className="font-semibold">{total}</dd></div>
            <div className="flex justify-between"><dt>Location</dt><dd className="font-semibold">{mode === "blank" ? "Blank (field activation)" : mode === "single" ? `${lat}, ${lng}` : "Zone scatter"}</dd></div>
          </dl>
          <label className="text-sm font-medium mt-3 block">
            Plantation date (optional, leave blank to register unplanted QR codes)
            <input
              type="date"
              aria-label="Plantation date"
              max={new Date().toISOString().slice(0, 10)}
              value={plantedDate}
              onChange={(e) => setPlantedDate(e.target.value)}
              className="mt-1 w-full !rounded-2xl"
            />
          </label>
          {plantedDate && (
            <p className="text-xs text-[var(--gs-muted)] mt-1">Saplings will be stored as Planted on <FormattedDate value={plantedDate} />.</p>
          )}
          <p className="text-xs text-[var(--gs-muted)] mt-2">One transaction generates {total} nanoids + QR codes. The sheet re-renders below.</p>
        </section>
      )}

      {step === 4 && result && <QrSheet result={result} projectId={projectId} />}

      <div className="flex gap-2 mt-4 no-print">
        {step > 0 && step < 4 && <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={() => setStep((s) => s - 1)}><ArrowLeft size={14} aria-hidden /> Back</button>}
        {step < 3 && <button type="button" className="gs-chip inline-flex items-center gap-1.5" style={{ background: "var(--gs-ink)", color: "#fff" }} disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight size={14} aria-hidden /></button>}
        {step === 3 && <button type="button" className="gs-chip inline-flex items-center gap-1.5" style={{ background: "var(--gs-brand)", color: "#fff" }} disabled={!canNext || busy} onClick={submit}><QrCode size={14} aria-hidden />{busy ? "Generating…" : `Generate ${total} QR codes`}</button>}
        {step === 4 && <ActionLink href={`/projects/${projectId}`}>Back to project</ActionLink>}
      </div>
    </div>
  );
}

// Printable QR sheet (PRD §5.4 output): gridded QRs with short-codes + CSV.
// QRs render client-side from the same payload in chunks (non-blocking UI).
function QrSheet({ result, projectId }: { result: { created: number; saplings: CreatedSapling[] }; projectId: string }) {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [rendered, setRendered] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const batch = result.saplings.slice(0, 2000);
    (async () => {
      for (let i = 0; i < batch.length; i += 25) {
        if (cancelled) return;
        const chunk = batch.slice(i, i + 25);
        const urls = await Promise.all(chunk.map((s) => QRCode.toDataURL(s.url, { margin: 1, width: 180 })));
        if (cancelled) return;
        setCodes((prev) => {
          const next = { ...prev };
          chunk.forEach((s, j) => {
            next[s.nanoid] = urls[j];
          });
          return next;
        });
        setRendered((r) => Math.min(batch.length, r + chunk.length));
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result]);

  const downloadCsv = () => {
    const lines = ["nanoid,url", ...result.saplings.map((s) => `${s.nanoid},${s.url}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bulk-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="gs-card p-4">
      <h2 className="font-bold inline-flex items-center gap-1.5">
        <QrCode size={16} aria-hidden />
        5 · QR sheet: {result.created} codes {rendered < result.saplings.length && `(rendering ${rendered}/${result.saplings.length}…)`}
      </h2>
      <div className="flex gap-2 mt-2 mb-3 no-print">
        <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={() => window.print()}><Printer size={14} aria-hidden /> Print sheet</button>
        <button type="button" className="gs-chip inline-flex items-center gap-1.5" onClick={downloadCsv}><Download size={14} aria-hidden /> Download CSV</button>
        <ActionLink href="/scan">Activate in field</ActionLink>
      </div>
      <div className="qr-sheet grid grid-cols-2 sm:grid-cols-3 gap-3">
        {result.saplings.map((s) => (
          <div key={s.nanoid} className="qr-cell gs-card p-2 text-center">
            {codes[s.nanoid] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={codes[s.nanoid]} alt={`QR code for sapling ${s.nanoid}`} className="mx-auto" width={180} height={180} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-[var(--gs-muted)]">…</div>
            )}
            <p className="font-mono text-sm font-bold mt-1">{s.nanoid}</p>
            <QrCaption
              orgName={s.orgName}
              speciesName={s.speciesName}
              plantedAt={s.plantedAt}
              createdAt={s.createdAt}
              status={s.status}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
