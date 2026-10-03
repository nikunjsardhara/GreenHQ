import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { saplings } from "@/db/schema";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamic OG preview (tree + org) for WhatsApp/social shares, PRD §5.5.
export default async function OgImage({ params }: { params: Promise<{ nanoid: string }> }) {
  const { nanoid } = await params;
  let species = "A planted tree";
  let status = "";
  try {
    const row = await getDb().query.saplings.findFirst({
      where: and(eq(saplings.nanoid, nanoid), scopeAlive(saplings.deletedAt)),
      with: { species: true },
    });
    if (row) {
      species = row.species?.commonName ?? species;
      status = row.status;
    }
  } catch {
    /* fall back to generic card */
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#f6f8f4" }}>
        <div style={{ display: "flex", fontSize: 40, color: "#5f7166" }}>GreenHQ · {nanoid}</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#1a2b1f" }}>{species}</div>
        <div style={{ display: "flex", fontSize: 44, color: "#2e7d32" }}>{status}</div>
      </div>
    ),
    { ...size },
  );
}
