import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { organizations, saplingUpdates, saplings } from "@/db/schema";
import { api, clientKey, notFound } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";

// GET /api/public/saplings/[nanoid], rate-limited public JSON backing the
// QR profile page's interactive islands (map, timeline).
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const rl = checkRateLimit(`public:${clientKey(req)}`, 120, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    const { nanoid } = await ctx.params;
    const db = getDb();
    const row = await db.query.saplings.findFirst({
      where: and(eq(saplings.nanoid, nanoid), scopeAlive(saplings.deletedAt)),
      with: {
        species: true,
        project: { columns: { id: true, name: true } },
        updates: { orderBy: [desc(saplingUpdates.recordedAt)], limit: 50 },
      },
    });
    if (!row) throw notFound("Sapling not found.");
    const orgRow = await db.query.organizations.findFirst({
      where: eq(organizations.id, row.orgId),
      columns: { id: true, name: true, logoUrl: true, brandColor: true },
    });
    return NextResponse.json({
      sapling: {
        nanoid: row.nanoid,
        status: row.status,
        lat: row.lat,
        lng: row.lng,
        plantedAt: row.plantedAt,
        createdAt: row.createdAt,
        species: row.species
          ? { commonName: row.species.commonName, scientificName: row.species.scientificName, imageUrl: row.species.imageUrl }
          : null,
        project: row.project,
        updates: row.updates.map((u) => ({ status: u.status, photoUrl: u.photoUrl, note: u.note, recordedAt: u.recordedAt })),
        organization: orgRow,
      },
    });
  })(req, ctx);
}
