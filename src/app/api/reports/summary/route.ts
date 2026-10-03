import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/http";
import { getOrgSummary } from "@/lib/reports";
import { orgScope, requireUser } from "@/lib/server-auth";

// GET /api/reports/summary?orgId=, PRD §6.9 impact metrics.
export const GET = api(async (req: NextRequest) => {
  const me = await requireUser("report.export");
  const orgId = orgScope(me, { orgId: req.nextUrl.searchParams.get("orgId") });
  return NextResponse.json(await getOrgSummary(orgId));
});
