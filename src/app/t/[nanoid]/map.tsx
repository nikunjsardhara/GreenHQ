"use client";

import dynamic from "next/dynamic";

const SaplingMap = dynamic(() => import("@/components/map").then((m) => m.SaplingMap), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

export function PublicMap({ lat, lng, status }: { lat: number; lng: number; status: "registered" | "planted" | "growing" | "mature" | "lost" | "replaced" }) {
  return <SaplingMap lat={lat} lng={lng} status={status} />;
}
