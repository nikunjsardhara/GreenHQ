import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signPasswordReset } from "@/lib/auth";
import { api, notFound } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { appUrl } from "@/lib/qr";
import { orgScope, requireUser } from "@/lib/server-auth";
import { scopeOrg } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

// POST /api/users/[id]/reset-password, org admin resets a user's password
// (PRD §4: invite/remove/reset-password). Emails a 1-hour set-password link
// and returns it (handy when email is console-logged in dev).
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
  return api(async () => {
    const me = await requireUser("user.manage");
    const { id } = await ctx.params;
    const orgId = orgScope(me, {});
    const db = getDb();
    const row = await db.query.users.findFirst({
      where: and(eq(users.id, id), scopeOrg(users.orgId, orgId, users.deletedAt)),
    });
    if (!row) throw notFound("User not found.");
    const token = await signPasswordReset(row.id);
    const link = `${appUrl()}/reset/${token}`;
    await logAudit({
      orgId,
      userId: me.session.userId,
      action: "user.reset_password",
      entityType: "user",
      entityId: row.id,
    });
    await notify({
      orgId,
      userId: row.id,
      type: "auth.password_reset",
      payload: {},
      email: {
        to: row.email,
        subject: "Your GreenHQ password was reset",
        html: `<p>Hi ${row.name},</p><p>An administrator reset your password. <a href="${link}">Set a new one here</a>, this link expires in 1 hour.</p>`,
      },
    });
    return NextResponse.json({ ok: true, resetLink: link });
  })(req, ctx);
}
