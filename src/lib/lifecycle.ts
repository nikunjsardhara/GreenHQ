// Sapling lifecycle rules, PRD §5.3.
// Registered → Planted → Growing → Mature, with Lost/Dead and Replaced as
// exceptional states. Extracted here (instead of living inline in the status
// route) so the transition guard is unit-testable and reusable.
import type { SaplingStatus } from "@/db/schema";

/** Legal moves from each state (re-logging the same state is always allowed). */
export const LIFECYCLE_FLOW: Record<SaplingStatus, SaplingStatus[]> = {
  registered: ["planted", "lost"],
  planted: ["growing", "lost", "replaced"],
  growing: ["mature", "lost", "replaced"],
  mature: ["lost", "replaced"],
  lost: ["replaced"],
  replaced: ["planted", "growing"],
};

/** Display order for the growth stepper (terminal states appended as-is). */
export const LIFECYCLE_ORDER: SaplingStatus[] = ["registered", "planted", "growing", "mature"];

/** Every status, for the permission-gated arbitrary picker. */
export const ALL_STATUSES: SaplingStatus[] = [
  "registered",
  "planted",
  "growing",
  "mature",
  "lost",
  "replaced",
];

export function canTransition(from: SaplingStatus, to: SaplingStatus): boolean {
  return from === to || LIFECYCLE_FLOW[from].includes(to);
}

/** Next states offered in UI steppers (excludes exceptional paths). */
export function nextGrowthStage(from: SaplingStatus): SaplingStatus | null {
  const i = LIFECYCLE_ORDER.indexOf(from);
  return i >= 0 && i < LIFECYCLE_ORDER.length - 1 ? LIFECYCLE_ORDER[i + 1] : null;
}

/**
 * Statuses the UI may offer from `from`: the guided lifecycle moves, or, 
 * with the `sapling.override_status` permission, a jump to any status.
 */
export function allowedTargets(from: SaplingStatus, override: boolean): SaplingStatus[] {
  if (override) return ALL_STATUSES.filter((s) => s !== from);
  return [...LIFECYCLE_FLOW[from]];
}
