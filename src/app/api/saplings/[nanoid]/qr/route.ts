import { NextRequest, NextResponse } from "next/server";
import { api, notFound } from "@/lib/http";
import { requireUser } from "@/lib/server-auth";
import { qrPngDataUrl, qrSvg, saplingUrl } from "@/lib/qr";
import { findSaplingByCode } from "@/lib/saplings";

// GET /api/saplings/[nanoid]/qr?format=svg|png, QR encoding the CURRENT
// NEXT_PUBLIC_APP_URL base (regenerated live, never the creation-time stored
// SVG, so scans land on the right host even if the env changed since).
export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("sapling.read");
    const { nanoid } = await ctx.params;
    const orgId = me.session.isSuperAdmin ? (req.nextUrl.searchParams.get("orgId") ?? null) : me.session.orgId;
    const row = await findSaplingByCode(orgId, nanoid);
    if (!row) throw notFound("Sapling not found.");
    if (req.nextUrl.searchParams.get("format") === "png") {
      return NextResponse.json({ png: await qrPngDataUrl(saplingUrl(row.nanoid)) });
    }
    return new NextResponse(await qrSvg(saplingUrl(row.nanoid)), { headers: { "Content-Type": "image/svg+xml" } });
  })(req, ctx);
}
