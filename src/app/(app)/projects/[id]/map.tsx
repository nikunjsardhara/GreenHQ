"use client";

import dynamic from "next/dynamic";
import { SectionCard } from "@/components/ui";

const ZoneDisplay = dynamic(() => import("@/components/map").then((m) => m.ZoneDisplay), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--gs-muted)]">Loading map…</p>,
});

export function ProjectMap({
  zone,
  areaHa,
}: {
  zone: { coordinates?: [number, number][][] } | null;
  areaHa: number;
}) {
  const ring = zone?.coordinates?.[0] ?? null;
  return (
    <SectionCard
      title="Project zone"
      subtitle={ring ? `${areaHa} ha mapped area` : "No boundary mapped yet"}
    >
      {ring ? (
        <ZoneDisplay ring={ring} />
      ) : (
        <p className="text-sm text-[var(--gs-muted)]">
          Draw the plantation boundary when creating the project to see it here.
        </p>
      )}
    </SectionCard>
  );
}
