"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, MapPin, Save } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { toast } from "@/lib/toast";

const PinPicker = dynamic(() => import("@/components/map").then((m) => m.PinPicker), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

const SaplingMap = dynamic(() => import("@/components/map").then((m) => m.SaplingMap), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

// Location correction for a single sapling: GPS capture or manual pin,
// saved with a timeline entry so the move stays in history.
export function EditLocation({
  nanoid,
  currentLat,
  currentLng,
  currentAccuracy,
  canEdit,
  status = "planted",
}: {
  nanoid: string;
  currentLat: number | null;
  currentLng: number | null;
  currentAccuracy?: number | null;
  canEdit: boolean;
  status?: "registered" | "planted" | "growing" | "mature" | "lost" | "replaced";
}) {
  const router = useRouter();
  const fmt = (n: number | null) => (n == null ? "" : String(n));
  const [lat, setLat] = useState(fmt(currentLat));
  const [lng, setLng] = useState(fmt(currentLng));
  const [accuracy, setAccuracy] = useState(
    currentAccuracy != null ? String(Math.round(currentAccuracy)) : "",
  );
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!canEdit) {
    if (currentLat == null || currentLng == null) return null;
    return (
      <div className="gs-card p-4 mt-3">
        <h3 className="font-bold text-sm inline-flex items-center gap-1.5">
          <MapPin size={14} aria-hidden />
          Location
        </h3>
        <p className="text-xs text-[var(--gs-muted)] mt-1.5">
          {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
          {currentAccuracy != null ? ` (±${Math.round(currentAccuracy)} m)` : ""}.
        </p>
        <div className="mt-3">
          <SaplingMap lat={currentLat} lng={currentLng} accuracyM={currentAccuracy} status={status} label="Sapling location" />
        </div>
      </div>
    );
  }

  const latNum = lat === "" ? NaN : Number(lat);
  const lngNum = lng === "" ? NaN : Number(lng);
  const valid =
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180;
  const changed = valid && (latNum !== currentLat || lngNum !== currentLng);
  const canSave = changed && !saving && !locating;

  const captureGps = () => {
    if (!navigator.geolocation) return toast("Geolocation unavailable, pin manually.", "error");
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
        toast("GPS failed, pin the location manually.", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await apiFetch(`/api/saplings/${nanoid}/location`, {
        method: "PATCH",
        body: JSON.stringify({
          lat: latNum,
          lng: lngNum,
          accuracyM: accuracy === "" ? null : Number(accuracy),
        }),
      });
      toast("Location updated.", "success");
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
        <MapPin size={14} aria-hidden />
        Edit location
      </h3>
      {currentLat == null || currentLng == null ? (
        <p className="text-xs text-[var(--gs-muted)] mt-1.5">
          No GPS point yet, capture one below or drop the pin on the map.
        </p>
      ) : (
        <p className="text-xs text-[var(--gs-muted)] mt-1.5">
          Currently {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
          {currentAccuracy != null ? ` (±${Math.round(currentAccuracy)} m)` : ""}.
        </p>
      )}
      <div className="flex gap-2 mt-3">
        <input
          aria-label="Latitude"
          placeholder="Latitude"
          inputMode="decimal"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="flex-1 !rounded-2xl"
        />
        <input
          aria-label="Longitude"
          placeholder="Longitude"
          inputMode="decimal"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="flex-1 !rounded-2xl"
        />
      </div>
      <div className="flex gap-2 mt-2 items-center">
        <button
          type="button"
          className="gs-chip inline-flex items-center gap-1.5"
          disabled={locating}
          onClick={captureGps}
        >
          {locating ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <LocateFixed size={14} aria-hidden />}
          {locating ? "Locating…" : "Use GPS"}
        </button>
        {accuracy && <span className="text-xs text-[var(--gs-muted)]">±{accuracy} m</span>}
      </div>
      <div className="mt-2">
        <p className="text-xs text-[var(--gs-muted)] mb-1">Or tap the map / drag the pin:</p>
        <PinPicker
          value={valid ? { lat: latNum, lng: lngNum } : null}
          onChange={(p) => {
            setLat(String(Number(p.lat.toFixed(6))));
            setLng(String(Number(p.lng.toFixed(6))));
          }}
        />
      </div>
      <button
        type="button"
        className="gs-chip mt-3 inline-flex items-center gap-1.5"
        style={{ background: "var(--gs-ink)", color: "#fff" }}
        disabled={!canSave}
        onClick={save}
      >
        {saving ? <Loader2 size={14} aria-hidden className="animate-spin" /> : <Save size={14} aria-hidden />}
        {saving ? "Saving…" : "Save location"}
      </button>
      {valid && !changed && (
        <p className="text-xs text-[var(--gs-muted)] mt-2">No changes yet, move the pin or enter new coordinates.</p>
      )}
    </div>
  );
}
