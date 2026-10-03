"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui";

const OrgMap = dynamic(() => import("@/components/map").then((m) => m.OrgMap), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

export function OrgMapClient({ points }: { points: { lat: number; lng: number; status: "registered" | "planted" | "growing" | "mature" | "lost" | "replaced"; href: string; label: string }[] }) {
  return (
    <div>
      <PageHeader title="Org map" subtitle={`${points.length} saplings with GPS`} />
      <div className="gs-card overflow-hidden">
        <OrgMap points={points} />
      </div>
      <p className="text-xs text-[var(--gs-muted)] mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} aria-hidden className="text-[var(--gs-brand)]" /> in ground
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} aria-hidden className="text-gray-400" /> registered (awaiting activation)
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} aria-hidden className="text-red-500" /> lost
        </span>
      </p>
    </div>
  );
}
