import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { gifts, projects, saplings, species, organizations } from "@/db/schema";
import { api, badRequest, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { giftUrl, newPublicId, qrSvg, saplingUrl } from "@/lib/qr";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive, scopeOrg } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";

// GET /api/gifts, scoped gift list (gift.manage or gift.create).
export const GET = api(async () => {
  const me = await requireUser("gift.create");
  const orgId = orgScope(me, {});
  const rows = await getDb().query.gifts.findMany({
    where: scopeOrg(gifts.orgId, orgId, gifts.deletedAt),
    orderBy: desc(gifts.createdAt),
    limit: 200,
    with: { sapling: { with: { species: true } } },
  });
  return NextResponse.json({ gifts: rows.map((g) => ({ ...g, url: giftUrl(g.shareToken) })) });
});

// POST /api/gifts, PRD §5.6: pick an existing sapling OR reserve a new one
// from a project, then create the gift record + share link.
const Body = z.object({
  saplingNanoid: z.string().optional(),
  reserveNew: z.object({ projectId: z.string().uuid(), speciesId: z.string().uuid().nullable().optional() }).optional(),
  recipientName: z.string().min(1).max(160),
  recipientContact: z.string().max(160).optional(),
  message: z.string().max(1000).optional(),
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("gift.create");
  const orgId = orgScope(me, {});
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("recipientName and a sapling (or reserveNew) are required.");
  if (!parsed.data.saplingNanoid && !parsed.data.reserveNew)
    throw badRequest("Provide saplingNanoid or reserveNew.");
  const db = getDb();

  let saplingId: string;
  if (parsed.data.saplingNanoid) {
    const s = await db.query.saplings.findFirst({
      where: and(
        eq(saplings.nanoid, parsed.data.saplingNanoid),
        scopeOrg(saplings.orgId, orgId, saplings.deletedAt),
      ),
      with: { gift: true },
    });
    if (!s) throw notFound("Sapling not found.");
    if (s.gift) return NextResponse.json({ error: "Sapling is already gifted." }, { status: 409 });
    saplingId = s.id;
  } else {
    const { projectId, speciesId } = parsed.data.reserveNew!;
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), scopeOrg(projects.orgId, orgId, projects.deletedAt)),
    });
    if (!project) throw notFound("Project not found.");
    if (speciesId) {
      const sp = await db.query.species.findFirst({
        where: and(eq(species.id, speciesId), scopeAlive(species.deletedAt)),
      });
      if (!sp || (sp.orgId !== null && sp.orgId !== orgId)) throw badRequest("Unknown species.");
    }
    const code = newPublicId();
    const [s] = await db
      .insert(saplings)
      .values({
        orgId,
        projectId,
        speciesId: speciesId ?? null,
        nanoid: code,
        qrSvg: await qrSvg(saplingUrl(code)),
        status: "registered",
      })
      .returning();
    saplingId = s.id;
  }

  const shareToken = newPublicId() + newPublicId().slice(0, 2);
  const [gift] = await db
    .insert(gifts)
    .values({
      orgId,
      saplingId,
      giftedByUserId: me.session.userId,
      recipientName: parsed.data.recipientName,
      recipientContact: parsed.data.recipientContact ?? null,
      message: parsed.data.message ?? null,
      shareToken,
    })
    .returning();
  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "gift.create",
    entityType: "gift",
    entityId: gift.id,
    after: { recipient: gift.recipientName },
  });
  await notify({
    orgId,
    userId: me.session.userId,
    type: "gift.created",
    payload: { giftId: gift.id, saplingId, recipient: gift.recipientName },
  });
  return NextResponse.json(
    {
      gift: {
        ...gift,
        url: giftUrl(shareToken),
        ...(await giftSaplingLabels(saplingId)),
      },
    },
    { status: 201 },
  );
});

async function giftSaplingLabels(saplingId: string) {
  const db = getDb();
  const s = await db.query.saplings.findFirst({
    where: eq(saplings.id, saplingId),
    columns: { nanoid: true, speciesId: true, status: true, plantedAt: true, createdAt: true, orgId: true },
    with: { species: { columns: { commonName: true } } },
  });
  const org = s
    ? await db.query.organizations.findFirst({
        where: eq(organizations.id, s.orgId),
        columns: { name: true },
      })
    : null;
  return {
    saplingNanoid: s?.nanoid ?? null,
    saplingStatus: s?.status ?? null,
    orgName: org?.name ?? null,
    speciesName: s?.species?.commonName ?? null,
    plantedAt: s?.plantedAt ?? null,
    saplingCreatedAt: s?.createdAt ?? null,
  };
}
