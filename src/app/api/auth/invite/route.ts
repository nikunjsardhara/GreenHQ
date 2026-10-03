import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signInvite } from "@/lib/auth";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { appUrl } from "@/lib/qr";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// POST /api/auth/invite, org admin invites a user (user.manage).
const InviteBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  roleId: z.string().uuid().nullable().optional(),
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser("user.manage");
  const parsed = InviteBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("Valid email, name and optional roleId required.");
  const orgId = orgScope(me, {});
  const email = parsed.data.email.trim().toLowerCase();

  const dupe = await getDb().query.users.findFirst({
    where: and(eq(users.email, email), scopeAlive(users.deletedAt)),
  });
  if (dupe) return NextResponse.json({ error: "That email is already registered." }, { status: 409 });

  const [row] = await getDb()
    .insert(users)
    .values({
      orgId,
      email,
      passwordHash: `invited:${Date.now()}`, // unusable until invite accepted
      name: parsed.data.name,
      status: "invited",
      roleId: parsed.data.roleId ?? null,
    })
    .returning();

  const token = await signInvite({ email, orgId, roleId: row.roleId });
  const link = `${appUrl()}/invite/${token}`;
  await logAudit({
    orgId,
    userId: me.session.userId,
    action: "user.invite",
    entityType: "user",
    entityId: row.id,
    after: { email },
  });
  await notify({
    orgId,
    userId: row.id,
    type: "invite.received",
    payload: { email },
    email: {
      to: email,
      subject: "You're invited to GreenHQ",
      html: `<p>Hi ${parsed.data.name},</p><p>You've been invited to join GreenHQ. <a href="${link}">Set your password to accept</a>.</p>`,
    },
  });
  return NextResponse.json({ ok: true, inviteLink: link });
});
