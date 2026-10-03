import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import { api } from "@/lib/http";
import { orgScope, requireUser } from "@/lib/server-auth";
import { and, desc, eq } from "drizzle-orm";

// GET /api/audit?entityType=&entityId=&limit=, PRD §6.10.
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("audit.read");
  const sp = req.nextUrl.searchParams;
  const orgId = me.session.isSuperAdmin ? (sp.get("orgId") ?? null) : orgScope(me, {});
  const filters = orgId && orgId !== "__global__" ? [eq(auditLog.orgId, orgId)] : [];
  const entityType = sp.get("entityType");
  const entityId = sp.get("entityId");
  if (entityType) filters.push(eq(auditLog.entityType, entityType));
  if (entityId) filters.push(eq(auditLog.entityId, entityId));
  const rows = await getDb().query.auditLog.findMany({
    where: filters.length ? and(...filters) : undefined,
    orderBy: desc(auditLog.createdAt),
    limit: Math.min(Number(sp.get("limit") ?? 100), 500),
  });
  return NextResponse.json({ entries: rows });
});
