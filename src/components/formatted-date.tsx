"use client";

import { formatDateTime, formatDay } from "@/lib/dates";

// Hydration-safe date text for client-component trees: the formatted output
// is locale-independent, and suppressHydrationWarning covers the remaining
// server-vs-browser timezone edge so date rendering can never crash hydration.
export function FormattedDate({ value }: { value: string | Date | null | undefined }) {
  return <span suppressHydrationWarning>{formatDay(value)}</span>;
}

export function FormattedDateTime({ value }: { value: string | Date | null | undefined }) {
  return <span suppressHydrationWarning>{formatDateTime(value)}</span>;
}
