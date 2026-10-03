import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signPasswordReset, verifyPasswordReset } from "@/lib/auth";
import { api, badRequest, clientKey } from "@/lib/http";
import { notify } from "@/lib/notifications";
import { appUrl } from "@/lib/qr";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// POST /api/auth/forgot, request reset link (public, anti-enumeration: always ok).
export const POST = api(async (req: NextRequest) => {
  const rl = checkRateLimit(`forgot:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts, try again later." }, { status: 429 });
  const { email } = z.object({ email: z.string().email() }).parse(await req.json().catch(() => ({})));
  const row = await getDb().query.users.findFirst({
    where: and(eq(users.email, email.trim().toLowerCase()), scopeAlive(users.deletedAt)),
  });
  if (row) {
    const token = await signPasswordReset(row.id);
    const link = `${appUrl()}/reset/${token}`;
    await notify({
      orgId: row.orgId,
      userId: row.id,
      type: "auth.password_reset",
      payload: {},
      email: {
        to: row.email,
        subject: "Reset your GreenHQ password",
        html: `<p>Hi ${row.name},</p><p><a href="${link}">Reset your password</a>, this link expires in 1 hour.</p>`,
      },
    });
  }
  return NextResponse.json({ ok: true });
});

// PUT /api/auth/forgot, redeem reset token + set new password (public).
const ResetBody = z.object({ token: z.string(), password: z.string().min(8) });

export const PUT = api(async (req: NextRequest) => {
  const parsed = ResetBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("Valid token and 8+ character password required.");
  const userId = await verifyPasswordReset(parsed.data.token);
  if (!userId) throw badRequest("Reset link is invalid or expired.");
  await getDb().update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
});
