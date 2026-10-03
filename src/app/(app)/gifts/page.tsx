import Link from "next/link";
import { BadgeCheck, CalendarDays, Clock, Gift as GiftIcon, Plus } from "lucide-react";
import { effectivePlantedAt } from "@/lib/dates";
import { getDb } from "@/db";
import { gifts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { giftUrl } from "@/lib/qr";
import { scopeOrg } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { FormattedDate } from "@/components/formatted-date";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function GiftsPage() {
  const u = (await getCurrentUser())!;
  const rows = await getDb().query.gifts.findMany({
    where: scopeOrg(gifts.orgId, u.session.orgId!, gifts.deletedAt),
    orderBy: desc(gifts.createdAt),
    limit: 200,
    with: { sapling: { with: { species: true, project: { columns: { id: true, name: true, startDate: true } } } } },
  });

  return (
    <div>
      <PageHeader
        title="Gifts"
        subtitle={`${rows.length} trees gifted`}
        actions={<Link href="/gifts/new" className="gs-chip !bg-[var(--gs-ink)] !text-white !px-5 !py-3 inline-flex items-center gap-1.5"><Plus size={16} aria-hidden /> Gift a tree</Link>}
      />
      <ul className="flex flex-col gap-3">
        {rows.map((g) => {
          // Own planted date, else the project's plantation-start date.
          const planted = effectivePlantedAt(g.sapling?.plantedAt, g.sapling?.project?.startDate);
          return (
          <li key={g.id}>
            <Link href={giftUrl(g.shareToken)} className="gs-card p-4 flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-[var(--gs-coral-light)] flex items-center justify-center text-[var(--gs-coral)]" aria-hidden>
                <GiftIcon size={22} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-semibold text-[var(--gs-ink)]">
                  For {g.recipientName}
                  {g.claimedAt ? (
                    <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2 py-0.5" style={{ background: "#e6f2e7", color: "var(--gs-brand-ink)" }}>
                      <BadgeCheck size={12} aria-hidden /> Claimed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2 py-0.5" style={{ background: "#fdf3d7", color: "#7a5200" }}>
                      <Clock size={12} aria-hidden /> Unclaimed
                    </span>
                  )}
                </span>
                <span className="block text-xs text-[var(--gs-muted)] mt-1">
                  {g.sapling?.species?.commonName ?? "Tree"} · {g.claimedAt ? (<>Claimed <FormattedDate value={g.claimedAt} /></>) : "Unclaimed"}
                </span>
                <span className="block text-xs text-[var(--gs-muted)] mt-0.5">
                  {planted
                    ? (<>Planted: <FormattedDate value={planted} /> · Registered: <FormattedDate value={g.sapling ? g.sapling.createdAt : null} /></>)
                    : (<>Registered: <FormattedDate value={g.sapling ? g.sapling.createdAt : null} /></>)}
                </span>
              </span>
              <span className="text-xs text-[var(--gs-muted)] inline-flex items-center gap-1 shrink-0">
                <CalendarDays size={12} aria-hidden />
                <FormattedDate value={g.createdAt} />
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
      {rows.length === 0 && (
        <p className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
          <GiftIcon size={15} aria-hidden />
          No gifts yet.
        </p>
      )}
    </div>
  );
}
