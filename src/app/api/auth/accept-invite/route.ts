import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyInvite } from "@/lib/auth";
import { api, badRequest, clientKey } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// POST /api/auth/accept-invite, redeem invite token + set password (public).
const Body = z.object({
  token: z.string(),
  name: z.string().min(1).max(120),
  password: z.string().min(8),
});

export const POST = api(async (req: NextRequest) => {
  const rl = checkRateLimit(`accept-invite:${clientKey(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts, try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("Name and 8+ character password required.");
  const claim = await verifyInvite(parsed.data.token);
  if (!claim) throw badRequest("Invite link is invalid or expired.");

  const existing = await getDb().query.users.findFirst({
    where: and(eq(users.email, claim.email), scopeAlive(users.deletedAt)),
  });
  const passwordHash = await hashPassword(parsed.data.password);
  if (existing) {
    if (existing.status === "active")
      return NextResponse.json({ error: "Account already active, just sign in." }, { status: 409 });
    await getDb()
      .update(users)
      .set({ name: parsed.data.name, passwordHash, status: "active" })
      .where(eq(users.id, existing.id));
  } else {
    await getDb().insert(users).values({
      orgId: claim.orgId,
      email: claim.email,
      passwordHash,
      name: parsed.data.name,
      status: "active",
      roleId: claim.roleId,
    });
  }
  return NextResponse.json({ ok: true });
});
