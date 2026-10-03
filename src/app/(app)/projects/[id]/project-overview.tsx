import { Sprout, Target, Map as MapIcon } from "lucide-react";
import { ProgressBar, SectionCard } from "@/components/ui";

/** Stats + planting progress in one overview card. */
export function ProjectOverview({
  saplingCount,
  targetCount,
  areaHa,
}: {
  saplingCount: number;
  targetCount: number;
  areaHa: number;
}) {
  const pct = targetCount > 0 ? (saplingCount / targetCount) * 100 : 0;
  return (
    <SectionCard title="Overview" subtitle="Planting progress at a glance">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]"
            aria-hidden
          >
            <Sprout size={22} />
          </span>
          <span>
            <span className="block font-bold text-lg leading-tight">{saplingCount}</span>
            <span className="block text-xs text-[var(--gs-muted)]">Saplings</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]"
            aria-hidden
          >
            <Target size={22} />
          </span>
          <span>
            <span className="block font-bold text-lg leading-tight">{targetCount}</span>
            <span className="block text-xs text-[var(--gs-muted)]">Target</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]"
            aria-hidden
          >
            <MapIcon size={22} />
          </span>
          <span>
            <span className="block font-bold text-lg leading-tight">{areaHa} ha</span>
            <span className="block text-xs text-[var(--gs-muted)]">Zone area</span>
          </span>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar
          value={pct}
          label={`${saplingCount} of ${targetCount} target saplings`}
        />
      </div>
    </SectionCard>
  );
}
