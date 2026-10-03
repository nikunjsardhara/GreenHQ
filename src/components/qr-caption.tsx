// Printable caption shown below every QR code: organization name,
// species name, plus Planted date (the sapling's own date, else the
// project's plantation-start date, else the Registered date, never a dash)
// or Registered date. Print-friendly (no screen-only styling).
"use client";
import { Printer } from "lucide-react";
import { effectivePlantedAt } from "@/lib/dates";
import { FormattedDate } from "./formatted-date";
export function QrCaption({
  orgName,
  speciesName,
  plantedAt,
  createdAt,
  status,
  projectStartDate,
}: {
  orgName: string | null | undefined;
  speciesName: string | null | undefined;
  plantedAt: string | Date | null | undefined;
  createdAt?: string | Date | null | undefined;
  status?: string | null | undefined;
  projectStartDate?: string | Date | null | undefined;
}) {
  const isRegistered = status === "registered";
  const planted = effectivePlantedAt(plantedAt, projectStartDate) ?? createdAt;
  return (
    <div className="mt-1 text-center">
      <p className="text-sm font-bold leading-snug">{orgName ?? ", "}</p>
      <p className="text-xs leading-snug">{speciesName ?? "Unassigned species"}</p>
      <p className="text-xs leading-snug">{isRegistered ? "Registered: " : "Planted: "}<FormattedDate value={isRegistered ? createdAt : planted} /></p>
    </div>
  );
}

export function QrPrintButton({ label = "Print QR" }: { label?: string }) {
  return (
    <button type="button" className="gs-chip mt-3 no-print inline-flex items-center gap-1.5" onClick={() => window.print()}>
      <Printer size={14} aria-hidden />
      {label}
    </button>
  );
}
