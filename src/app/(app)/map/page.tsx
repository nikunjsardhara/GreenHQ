import { getDb } from "@/db";
import { saplings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { scopeOrg } from "@/lib/tenant";
import { and, isNotNull } from "drizzle-orm";
import { OrgMapClient } from "./client";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const u = (await getCurrentUser())!;
  const rows = await getDb().query.saplings.findMany({
    where: and(
      scopeOrg(saplings.orgId, u.session.orgId!, saplings.deletedAt),
      isNotNull(saplings.lat),
      isNotNull(saplings.lng),
    ),
    columns: { nanoid: true, lat: true, lng: true, status: true },
    limit: 2000,
  });

  return (
    <OrgMapClient
      points={rows.map((r) => ({
        lat: r.lat!,
        lng: r.lng!,
        status: r.status,
        href: `/saplings/${r.nanoid}`,
        label: r.nanoid,
      }))}
    />
  );
}
