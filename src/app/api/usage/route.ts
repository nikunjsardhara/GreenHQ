import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { usageMetrics } from "@/db/schema";
import { api } from "@/lib/http";
import { orgScope, requireUser } from "@/lib/server-auth";
import { desc, eq } from "drizzle-orm";

// GET /api/usage?orgId=, metering rows for billing reports (PRD §6.15).
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("report.export");
  const orgId = orgScope(me, { orgId: req.nextUrl.searchParams.get("orgId") });
  const rows = await getDb().query.usageMetrics.findMany({
    where: eq(usageMetrics.orgId, orgId),
    orderBy: desc(usageMetrics.periodStart),
    limit: 100,
  });
  return NextResponse.json({ metrics: rows });
});
