"use client";

import { useEffect, useState } from "react";

// Loads Oat's JS (Web Components: ot-tabs, ot-dropdown, …) client-side only.
// Oat styles plain semantic HTML automatically via the global CSS import;
// this just upgrades the interactive bits., PRD §9 Oat integration spike.
export function OatLoader() {
  useEffect(() => {
    let cancelled = false;
    import("@knadh/oat/oat.min.js").catch((err) => {
      if (!cancelled) console.warn("[oat] web components failed to load", err);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

// Thin React wrapper around Oat's <ot-tabs> Web Component.
export function OatTabs({
  tabs,
  initial = 0,
  labelledBy,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
  initial?: number;
  labelledBy?: string;
}) {
  // Tabs are static per usage; clamp once instead of syncing in an effect.
  const [active, setActive] = useState(() => Math.min(initial, Math.max(0, tabs.length - 1)));
  return (
    <div>
      {/* @ts-expect-error Oat custom element */}
      <ot-tabs aria-label={labelledBy ?? "Sections"}>
        <div role="tablist" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {tabs.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === i}
              className="gs-chip"
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      {/* @ts-expect-error Oat custom element */}
      </ot-tabs>
      <div role="tabpanel" style={{ marginTop: "1rem" }}>
        {tabs[active]?.content}
      </div>
    </div>
  );
}
