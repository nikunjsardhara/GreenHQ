import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { api, badRequest } from "@/lib/http";
import { requireUser } from "@/lib/server-auth";
import { and, desc, eq, isNull } from "drizzle-orm";

// GET /api/notifications, own inbox. PATCH mark read.
export const GET = api(async () => {
  const me = await requireUser();
  const rows = await getDb().query.notifications.findMany({
    where: eq(notifications.userId, me.session.userId),
    orderBy: desc(notifications.createdAt),
    limit: 50,
  });
  const unread = rows.filter((r) => !r.readAt).length;
  return NextResponse.json({ notifications: rows, unread });
});

const PatchBody = z.object({ ids: z.array(z.string().uuid()).max(50) });

export const PATCH = api(async (req: NextRequest) => {
  const me = await requireUser();
  const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("ids[] required.");
  const db = getDb();
  for (const id of parsed.data.ids) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, me.session.userId), isNull(notifications.readAt)));
  }
  return NextResponse.json({ ok: true });
});
