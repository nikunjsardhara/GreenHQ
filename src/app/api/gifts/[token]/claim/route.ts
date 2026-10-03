import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { gifts, users } from "@/db/schema";
import { api, badRequest, clientKey, notFound } from "@/lib/http";
import { notify, sendEmail } from "@/lib/notifications";
import { giftUrl } from "@/lib/qr";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// POST /api/gifts/[token]/claim, public gift claim (PRD §5.6, no account needed).
const Body = z.object({ contact: z.string().min(2).max(160) });

export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const rl = checkRateLimit(`claim:${clientKey(req)}`, 20, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "Too many attempts, try again later." }, { status: 429 });
    const { token } = await ctx.params;
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw badRequest("A contact (email/phone) is required to claim.");
    const db = getDb();
    const gift = await db.query.gifts.findFirst({
      where: and(eq(gifts.shareToken, token), scopeAlive(gifts.deletedAt)),
    });
    if (!gift) throw notFound("Gift not found.");
    if (gift.claimedAt) return NextResponse.json({ ok: true, already: true });
    await db.update(gifts).set({ claimedAt: new Date(), claimedByContact: parsed.data.contact }).where(eq(gifts.id, gift.id));
    await notify({
      orgId: gift.orgId,
      userId: gift.giftedByUserId,
      type: "gift.claimed",
      payload: { giftId: gift.id, saplingId: gift.saplingId, contact: parsed.data.contact },
    });
    // Email the gifter directly when we know their address (PRD §6.8).
    if (gift.giftedByUserId) {
      const gifter = await db.query.users.findFirst({
        where: eq(users.id, gift.giftedByUserId),
        columns: { email: true, name: true },
      });
      if (gifter) {
        await sendEmail({
          to: gifter.email,
          subject: `Your gifted tree was claimed by ${gift.recipientName}`,
          html: `<p>Hi ${gifter.name},</p><p>${gift.recipientName} claimed the tree you gifted. Follow it here: <a href="${giftUrl(token)}">${giftUrl(token)}</a></p>`,
        });
      }
    }
    return NextResponse.json({ ok: true });
  })(req, ctx);
}
