// Shared presentational primitives in the reference-app language (PRD §8):
// avatar stacks, stat rows, progress bars, pills, empty states. Lucide icons
// only; every icon-only button takes an aria-label (PRD §10 a11y).
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sprout } from "lucide-react";

/** Mobile-style navigational link: semibold text + chevron, no underline,
 *  44px touch target, focus-visible ring. Use for navigation; pills stay for
 *  buttons/toggles/CTAs. */
export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="gs-action-link">
      <span>{children}</span>
      <ChevronRight size={16} aria-hidden />
    </Link>
  );
}

/** Full-width settings-style menu row: label left, chevron right. */
export function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="gs-menu-link">
      <span>{children}</span>
      <ChevronRight size={18} aria-hidden />
    </Link>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const colors = ['var(--gs-coral)', 'var(--gs-mint)', 'var(--gs-yellow)', 'var(--gs-lavender)'];
  return (
    <div className="flex items-center" aria-label={`${names.length} team members`}>
      {shown.map((n, i) => (
        <span
          key={`${n}-${i}`}
          title={n}
          aria-hidden={extra === 0 && false}
          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[0.7rem] font-semibold text-white"
          style={{ background: colors[i % colors.length], marginLeft: i === 0 ? 0 : -8 }}
        >
          {n.slice(0, 1).toUpperCase()}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-xs font-semibold ml-1 text-[var(--gs-muted)]">+{extra}</span>
      )}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2.5 rounded-full bg-[var(--gs-line)] overflow-hidden"
      >
        <div className="h-full rounded-full bg-[var(--gs-mint)]" style={{ width: `${pct}%` }} />
      </div>
      {label && <div className="text-xs text-[var(--gs-muted)] mt-1">{label}</div>}
    </div>
  );
}

export function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]" aria-hidden>
        {icon}
      </span>
      <span>
        <span className="block font-bold text-lg leading-tight">{value}</span>
        <span className="block text-xs text-[var(--gs-muted)]">{label}</span>
      </span>
    </div>
  );
}

export function EmptyState({ title, hint, action, icon }: { title: string; hint?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="gs-card p-10 text-center">
      <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)]" aria-hidden>
        {icon ?? <Sprout size={22} />}
      </span>
      <p className="font-semibold text-lg text-[var(--gs-ink)]">{title}</p>
      {hint && <p className="text-sm text-[var(--gs-muted)] mt-2">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, subtitleClassName, actions }: { title: string; subtitle?: ReactNode; subtitleClassName?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-ink)] shrink-0" style={{ margin: 0 }}>{title}</h1>
      {subtitle && <p className={subtitleClassName ?? "text-sm text-[var(--gs-muted)] min-w-0"}>{subtitle}</p>}
      {actions && <div className="flex flex-wrap items-center gap-2 no-print ml-auto">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status badges, single source of truth for project / sapling pills. */
/* ------------------------------------------------------------------ */

type BadgeTone = "green" | "amber" | "blue" | "gray" | "red" | "purple" | "teal";

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  green: { bg: "#e6f2e7", fg: "var(--gs-brand-ink)", dot: "var(--gs-brand)" },
  amber: { bg: "#fdf3d7", fg: "#7a5200", dot: "#d99a00" },
  blue: { bg: "#e5eefc", fg: "#1d4fa3", dot: "#2f6fed" },
  gray: { bg: "#efedea", fg: "#555", dot: "#999" },
  red: { bg: "#fbe7e5", fg: "#b3261e", dot: "#d43a2f" },
  purple: { bg: "#efeafb", fg: "#5b3fa8", dot: "#7a5fd0" },
  teal: { bg: "var(--gs-mint-light)", fg: "var(--gs-brand-ink)", dot: "var(--gs-brand)" },
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  const s = TONE_STYLES[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {children}
    </span>
  );
}

const PROJECT_STATUS_TONE: Record<string, BadgeTone> = {
  planning: "amber",
  active: "green",
  completed: "blue",
  archived: "gray",
};

export function ProjectStatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={PROJECT_STATUS_TONE[status] ?? "gray"}>{label ?? status}</Badge>;
}

const SAPLING_STATUS_TONE: Record<string, BadgeTone> = {
  registered: "gray",
  planted: "green",
  growing: "teal",
  mature: "blue",
  lost: "red",
  replaced: "purple",
};

export function SaplingStatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge tone={SAPLING_STATUS_TONE[status] ?? "gray"}>{label ?? status}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Section cards, titled content blocks for detail pages.             */
/* ------------------------------------------------------------------ */

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  padded = true,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={`gs-card ${padded ? "p-5" : ""}`}>
      <div className={`flex items-start justify-between gap-3 ${padded ? "mb-4" : "px-5 pt-5 pb-4"}`}>
        <div>
          <h2 className="font-bold text-base text-[var(--gs-ink)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--gs-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 no-print">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Frontend pagination controls.                                        */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  onChange,
  rangeLabel,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  rangeLabel?: string;
}) {
  if (totalPages <= 1) return null;
  // Windowed page numbers: first, last, current ± 1.
  const nums = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const ordered = [...nums].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  for (let i = 0; i < ordered.length; i++) {
    items.push(ordered[i]);
    if (i < ordered.length - 1 && ordered[i + 1] - ordered[i] > 1) items.push("…");
  }
  const btn =
    "min-w-9 h-9 px-2 rounded-full text-sm font-semibold inline-flex items-center justify-center disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 mt-4">
      {rangeLabel && <p className="text-xs text-[var(--gs-muted)]">{rangeLabel}</p>}
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          className={`gs-chip ${btn}`}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        {items.map((it, i) =>
          it === "…" ? (
            <span key={`gap-${i}`} aria-hidden className="text-xs text-[var(--gs-muted)] px-1">
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              className="gs-chip min-w-9 h-9 px-2 text-sm font-semibold inline-flex items-center justify-center"
              aria-pressed={it === page}
              aria-label={`Page ${it}`}
              aria-current={it === page ? "page" : undefined}
              onClick={() => onChange(it)}
            >
              {it}
            </button>
          ),
        )}
        <button
          type="button"
          className={`gs-chip ${btn}`}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
