// Deterministic day formatting ("5 Dec 2026"), locale-independent so
// server-rendered HTML and client hydration always agree regardless of the
// runtime locale. Date-only strings (YYYY-MM-DD, e.g. project startDate) are
// parsed as calendar parts with no timezone involvement; timestamps use the
// viewer's local calendar day.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(value: string | Date): { d: number; m: number; y: number } | null {
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (m && value.trim().length <= 10) {
      return { d: Number(m[3]), m: Number(m[2]) - 1, y: Number(m[1]) };
    }
  }
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return null;
  return { d: t.getDate(), m: t.getMonth(), y: t.getFullYear() };
}

/** "5 Dec 2026", or "-" when empty/invalid. Never locale-dependent. */
export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const p = parts(value);
  if (!p || p.m < 0 || p.m > 11) return "-";
  return `${p.d} ${MONTHS[p.m]} ${p.y}`;
}

/** "5 Dec 2026, 14:05" in viewer-local time, or "-". Never locale-dependent. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return "-";
  const hh = String(t.getHours()).padStart(2, "0");
  const mm = String(t.getMinutes()).padStart(2, "0");
  return `${formatDay(t)}, ${hh}:${mm}`;
}

/** Effective plantation date for display: the sapling's own planted date,
 *  falling back to the project's plantation-start date (which the app treats
 *  as the displayed history date wherever saplings appear). Null only when
 *  neither exists. Callers should render the Registered date instead of a
 *  dash in that case. */
export function effectivePlantedAt(
  plantedAt: string | Date | null | undefined,
  projectStartDate: string | Date | null | undefined,
): string | Date | null {
  return plantedAt ?? projectStartDate ?? null;
}
