// Plantation-date resolution, every sapling must carry when it was planted.
// `planted_at` already exists on the saplings table (so no schema migration is
// needed); the gap was that status transitions never wrote it. Both the
// single-status and bulk-update routes resolve through here:
//   - explicit date from the client (plantation-date dialog / bulk date field)
//     always wins, validated and never in the future;
//   - moving to "planted" with no date and no stored date stamps the date of
//     change (now);
//   - anything else leaves the stored date untouched (never rewrites history).
import type { SaplingStatus } from "@/db/schema";

export function parsePlantedAt(raw: string, now: Date = new Date()): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Plantation date is not a valid date.");
  if (d.getTime() > now.getTime()) throw new Error("Plantation date cannot be in the future.");
  return d;
}

export function resolvePlantedAt({
  target,
  currentPlantedAt,
  explicitRaw,
  now = new Date(),
}: {
  target: SaplingStatus;
  currentPlantedAt: Date | string | null | undefined;
  explicitRaw?: string | null;
  now?: Date;
}): Date | undefined {
  if (explicitRaw) return parsePlantedAt(explicitRaw, now);
  if (target === "planted" && currentPlantedAt == null) return now;
  return undefined;
}
