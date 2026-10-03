"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Camera, ImagePlus, Loader2, LocateFixed, QrCode, Search, Sprout, Square } from "lucide-react";
import { effectivePlantedAt } from "@/lib/dates";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";
import { queueMutation } from "@/lib/outbox";
import { ActionLink, PageHeader } from "@/components/ui";
import { FormattedDate } from "@/components/formatted-date";
import { STRINGS } from "@/i18n/en";

const PinPicker = dynamic(() => import("@/components/map").then((m) => m.PinPicker), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

interface Found {
  nanoid: string;
  status: string;
  species: { commonName: string } | null;
  project: { id: string; name: string; startDate: string | null } | null;
  gift: { recipientName: string } | null;
  plantedAt: string | null;
  createdAt: string;
}

// Scan and field activation (PRD section 5.4): scan a pre-printed QR to attach real
// GPS + date + photo. Manual short-code entry is a first-class path (GPS and
// cameras both fail in the field), and everything queues offline.
export default function ScanPage() {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [looking, setLooking] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [plantedDate, setPlantedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [locating, setLocating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const lookup = async (rawCode: string) => {
    const nanoid = rawCode.trim().split("/").pop() || "";
    if (!nanoid) return;
    setLooking(true);
    try {
      const res = await apiFetch<{ sapling: Found }>(`/api/saplings/${encodeURIComponent(nanoid)}`);
      setFound(res.sapling);
      if (res.sapling.status !== "registered") toast(`Sapling is already ${res.sapling.status}.`, "info");
    } catch (err) {
      setFound(null);
      toast(err instanceof Error ? err.message : "Sapling not found.", "error");
    } finally {
      setLooking(false);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startCamera = async () => {
    if (!("BarcodeDetector" in window)) {
      toast("This browser can't scan in-page. Enter the short-code manually.", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      // @ts-expect-error BarcodeDetector is a browser API, not in TS DOM libs
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes?.[0]?.rawValue) {
            const value: string = codes[0].rawValue;
            stopCamera();
            setCode(value);
            await lookup(value);
            return;
          }
        } catch {
          /* keep scanning */
        }
        setTimeout(tick, 400);
      };
      tick();
    } catch {
      toast("Camera unavailable. Enter the short-code manually.", "error");
    }
  };

  const captureGps = () => {
    if (!navigator.geolocation) return toast("Geolocation unavailable. Pin manually.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setAccuracy(String(Math.round(pos.coords.accuracy)));
        toast(`GPS locked (±${Math.round(pos.coords.accuracy)} m).`, "success");
        setLocating(false);
      },
      () => {
        toast("GPS failed. Pin the location manually.", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const onPhotoFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast("Photo is over 1.5 MB and would bloat the offline queue. Use a smaller shot.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result ?? ""));
    reader.onerror = () => toast("Could not read that photo.", "error");
    reader.readAsDataURL(file);
  };

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!found) return;
    const payload = {
      lat: Number(lat),
      lng: Number(lng),
      accuracyM: accuracy ? Number(accuracy) : undefined,
      note: note || undefined,
      photoUrl: photoUrl || undefined,
      ...(plantedDate ? { plantedAt: new Date(`${plantedDate}T00:00:00`).toISOString() } : {}),
    };
    setSaving(true);
    try {
      if (!navigator.onLine) {
        await queueMutation({ kind: "activate-sapling", payload: { nanoid: found.nanoid, ...payload } });
        toast("Offline. Activation queued for sync.", "info");
      } else {
        await apiFetch(`/api/saplings/${found.nanoid}/activate`, { method: "PATCH", body: JSON.stringify(payload) });
        toast("Sapling activated. Planted!", "success");
      }
      setFound(null);
      setCode("");
      setLat("");
      setLng("");
      setNote("");
      setPhotoUrl("");
      setPlantedDate("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Activation failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={STRINGS.scan.title} subtitle={STRINGS.scan.hint} />
      <section className="gs-card p-4">
        <div className="flex gap-2">
          <input
            aria-label="Sapling short-code"
            placeholder={STRINGS.scan.codePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup(code)}
            className="flex-1 font-mono !rounded-2xl"
          />
          <button type="button" className="gs-chip inline-flex items-center gap-1.5" style={{ background: "var(--gs-ink)", color: "#fff" }} disabled={looking || !code.trim()} onClick={() => lookup(code)}>
            {looking ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <Search size={14} aria-hidden />}
            {looking ? "…" : "Find"}
          </button>
        </div>
        {!scanning ? (
          <button type="button" className="gs-chip mt-2 inline-flex items-center gap-1.5" onClick={startCamera}><Camera size={14} aria-hidden /> Scan with camera</button>
        ) : (
          <button type="button" className="gs-chip mt-2 inline-flex items-center gap-1.5" onClick={stopCamera}><Square size={14} aria-hidden /> Stop camera</button>
        )}
        <video ref={videoRef} playsInline muted aria-label="Camera viewfinder" className={scanning ? "w-full rounded-xl mt-2" : "hidden"} />
      </section>

      {found && (
        <section className="gs-card p-4 mt-3">
          <h2 className="font-mono font-bold inline-flex items-center gap-2">
            <QrCode size={16} aria-hidden className="text-[var(--gs-muted)]" />
            {found.nanoid}
          </h2>
          <p className="text-sm text-[var(--gs-muted)]">{found.species?.commonName ?? "Unassigned"} · {STRINGS.sapling.status[found.status as keyof typeof STRINGS.sapling.status] ?? found.status}</p>
          <p className="text-sm text-[var(--gs-muted)]">{(() => {
            const planted = effectivePlantedAt(found.plantedAt, found.project?.startDate);
            return planted ? (
              <>Planted: <FormattedDate value={planted} /> · Registered: <FormattedDate value={found.createdAt} /></>
            ) : (
              <>Registered: <FormattedDate value={found.createdAt} /></>
            );
          })()}</p>
          {found.project && (
            <p className="text-sm text-[var(--gs-muted)]">
              <Link href={`/projects/${found.project.id}`}>{found.project.name}</Link>
              {found.project.startDate ? (<> · since <FormattedDate value={found.project.startDate} /></>) : ""}
              {found.gift ? ` · gifted to ${found.gift.recipientName}` : ""}
            </p>
          )}
          {found.status === "registered" ? (
            <form onSubmit={activate} className="flex flex-col gap-2 mt-3">
              <div className="flex gap-2">
                <input aria-label="Latitude" placeholder="Latitude" inputMode="decimal" required value={lat} onChange={(e) => setLat(e.target.value)} className="flex-1 !rounded-2xl" />
                <input aria-label="Longitude" placeholder="Longitude" inputMode="decimal" required value={lng} onChange={(e) => setLng(e.target.value)} className="flex-1 !rounded-2xl" />
              </div>
              <div className="flex gap-2">
                <button type="button" className="gs-chip inline-flex items-center gap-1.5" disabled={locating} onClick={captureGps}>{locating ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <LocateFixed size={14} aria-hidden />} {locating ? "Locating…" : "Capture GPS"}</button>
                {accuracy && <span className="text-xs self-center text-[var(--gs-muted)]">±{accuracy} m</span>}
              </div>
              <div>
                <p className="text-xs text-[var(--gs-muted)] mb-1">Confirm or override on the map (tap or drag the pin):</p>
                <PinPicker
                  value={lat !== "" && lng !== "" ? { lat: Number(lat), lng: Number(lng) } : null}
                  onChange={(p) => {
                    setLat(String(Number(p.lat.toFixed(6))));
                    setLng(String(Number(p.lng.toFixed(6))));
                  }}
                />
              </div>
              <input aria-label="Field note (optional)" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full !rounded-2xl" />
              <label className="text-sm">
                Plantation date (optional, defaults to today)
                <input
                  type="date"
                  aria-label="Plantation date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={plantedDate}
                  onChange={(e) => setPlantedDate(e.target.value)}
                  className="w-full mt-1 !rounded-2xl"
                />
              </label>
              <label className="text-sm">
                <span className="inline-flex items-center gap-1.5"><ImagePlus size={14} aria-hidden /> Photo (optional, stored with the planting record, queued offline too)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Planting photo"
                  onChange={(e) => onPhotoFile(e.target.files?.[0])}
                  className="w-full mt-1"
                />
              </label>
              {photoUrl.startsWith("http") || photoUrl === "" ? (
                <input aria-label="Photo URL (alternative to upload)" placeholder="…or paste a photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="w-full !rounded-2xl" />
              ) : (
                <p className="text-xs text-[var(--gs-muted)]">Photo attached from camera ({Math.round(photoUrl.length / 1024)} KB). <button type="button" className="underline" onClick={() => setPhotoUrl("")}>Remove</button></p>
              )}
              <button type="submit" disabled={saving} style={{ background: "var(--gs-brand)", color: "#fff" }} className="!rounded-2xl inline-flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Sprout size={15} aria-hidden />}
                {saving ? "Saving…" : "Activate and mark planted"}
              </button>
            </form>
          ) : (
            <ActionLink href={`/saplings/${found.nanoid}`}>Open sapling</ActionLink>
          )}
        </section>
      )}
    </div>
  );
}
