import { Loader2 } from "lucide-react";

// Route-loading skeleton shown by loading.tsx during navigations, the loader
// between tapping a link and the next page rendering.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="flex flex-col gap-3">
      <div className="gs-card p-5 flex items-center gap-3">
        <Loader2 size={20} aria-hidden className="animate-spin text-[var(--gs-brand)] shrink-0" />
        <p className="text-sm font-semibold text-[var(--gs-muted)]">Loading…</p>
      </div>
      <div className="gs-card p-5 flex flex-col gap-2.5" aria-hidden>
        <div className="h-5 w-2/3 rounded-full bg-[var(--gs-line)] animate-pulse" />
        <div className="h-3.5 w-full rounded-full bg-[var(--gs-line)] animate-pulse" />
        <div className="h-3.5 w-5/6 rounded-full bg-[var(--gs-line)] animate-pulse" />
      </div>
      <div className="gs-card p-5 flex flex-col gap-2.5" aria-hidden>
        <div className="h-5 w-1/2 rounded-full bg-[var(--gs-line)] animate-pulse" />
        <div className="h-3.5 w-full rounded-full bg-[var(--gs-line)] animate-pulse" />
        <div className="h-3.5 w-4/6 rounded-full bg-[var(--gs-line)] animate-pulse" />
      </div>
    </div>
  );
}
