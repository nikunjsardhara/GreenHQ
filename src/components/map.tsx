"use client";

// Leaflet + OpenStreetMap wrappers, PRD §5.8. All maps are client components
// consumed via next/dynamic(ssr:false). Marker icons are pure CSS divIcons
// (no image assets) so maps keep working offline from the service-worker cache.
import { useEffect, useMemo } from "react";
import { MapContainer, Circle, Marker, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LngLat = [number, number];

function dot(color: string, size = 18): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgb(0 0 0/.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const DOT = {
  planted: "#2e7d32",
  growing: "#388e3c",
  mature: "#1b5e20",
  registered: "#9e9e9e",
  lost: "#c62828",
  replaced: "#f9a825",
} as const;

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [map, center]);
  return null;
}

/** Single sapling pin with accuracy-radius display + confirm/override affordance. */
export function SaplingMap({
  lat,
  lng,
  accuracyM,
  status = "planted",
  label,
}: {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  status?: keyof typeof DOT;
  label?: string;
}) {
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);
  return (
    <MapContainer center={center} zoom={16} style={{ height: 240, width: "100%", borderRadius: "0.75rem" }} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <Recenter center={center} />
      {accuracyM ? (
        <Circle center={center} radius={accuracyM} pathOptions={{ color: "#2e7d32", weight: 1, fillOpacity: 0.15 }} />
      ) : null}
      <Marker position={center} icon={dot(DOT[status] ?? DOT.planted)}>
        {label && <Tooltip>{label}</Tooltip>}
      </Marker>
    </MapContainer>
  );
}

function ClickCapture({ onPick }: { onPick: (p: LngLat) => void }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

/** Tap-to-draw zone polygon (no extra draw dependency). GeoJSON ring order. */
export function ZonePicker({ value, onChange }: { value: LngLat[] | null; onChange: (ring: LngLat[] | null) => void }) {
  const ring = value ?? [];
  const positions: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
  const center: [number, number] = positions.length
    ? [positions.reduce((a, p) => a + p[0], 0) / positions.length, positions.reduce((a, p) => a + p[1], 0) / positions.length]
    : [22.72, 75.86];
  return (
    <div>
      <MapContainer center={center} zoom={14} style={{ height: 260, width: "100%", borderRadius: "0.75rem" }} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <ClickCapture onPick={(p) => onChange([...ring, p])} />
        {positions.length > 2 && <Polygon positions={positions} pathOptions={{ color: "#2e7d32" }} />}
        {positions.map((p, i) => (
          <Marker key={i} position={p} icon={dot("#f9a825", 12)} />
        ))}
      </MapContainer>
      <div className="flex gap-2 mt-2 no-print">
        <button type="button" className="gs-chip" onClick={() => onChange(ring.slice(0, -1))} disabled={!ring.length}>
          Undo point
        </button>
        <button type="button" className="gs-chip" onClick={() => onChange(null)} disabled={!ring.length}>
          Clear zone
        </button>
        <span className="text-xs text-[var(--gs-muted)] self-center">Tap the map to add polygon points ({ring.length}).</span>
      </div>
    </div>
  );
}

/** Org-wide sapling map (PRD §5.8 cluster view, circle markers scale to hundreds). */
export function OrgMap({ points }: { points: { lat: number; lng: number; status: keyof typeof DOT; href: string; label: string }[] }) {
  const visible = points.filter((p) => p.lat != null && p.lng != null).slice(0, 2000);
  const center: [number, number] = visible.length
    ? [visible.reduce((a, p) => a + p.lat, 0) / visible.length, visible.reduce((a, p) => a + p.lng, 0) / visible.length]
    : [22.72, 75.86];
  return (
    <MapContainer center={center} zoom={visible.length ? 12 : 5} style={{ height: 420, width: "100%", borderRadius: "1rem" }} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      {visible.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={dot(DOT[p.status] ?? DOT.registered, 14)}>
          <Tooltip>
            <a href={p.href}>{p.label}</a>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

/** Stored zone polygon display (project detail hero map). */
export function ZoneDisplay({ ring }: { ring: LngLat[] | null }) {
  if (!ring || ring.length < 3) {
    return <p className="text-sm text-[var(--gs-muted)]">No zone drawn for this project yet.</p>;
  }
  const positions: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
  const center: [number, number] = [
    positions.reduce((a, p) => a + p[0], 0) / positions.length,
    positions.reduce((a, p) => a + p[1], 0) / positions.length,
  ];
  return (
    <MapContainer center={center} zoom={14} style={{ height: 220, width: "100%", borderRadius: "1rem" }} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <Polygon positions={positions} pathOptions={{ color: "#2e7d32" }} />
    </MapContainer>
  );
}

/** Single-pin picker for manual location fallback (PRD §5.3: GPS can fail, 
  manual pin is always available). Tap the map or drag the marker. */
export function PinPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
}) {
  const center: [number, number] = value ? [value.lat, value.lng] : [22.72, 75.86];
  return (
    <MapContainer center={center} zoom={value ? 16 : 5} style={{ height: 220, width: "100%", borderRadius: "0.75rem" }} scrollWheelZoom={false}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <ClickCapture onPick={([lng, lat]) => onChange({ lat, lng })} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={dot("#f9a825", 20)}
          draggable
          eventHandlers={{
            dragend(e) {
              const m = e.target as L.Marker;
              const p = m.getLatLng();
              onChange({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
