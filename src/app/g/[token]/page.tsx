import { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  BadgeCheck,
  CalendarDays,
  Gift as GiftIcon,
  Heart,
  Hourglass,
  Leaf,
  PackagePlus,
  Sprout,
  User,
} from "lucide-react";
import { getDb } from "@/db";
import { gifts, organizations, users } from "@/db/schema";
import { giftUrl } from "@/lib/qr";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";
import { ClaimIsland, PrintButton } from "./claim";
import { GiftMap } from "./map";
import { ActionLink } from "@/components/ui";
import { FormattedDate } from "@/components/formatted-date";
import { effectivePlantedAt } from "@/lib/dates";
import { STRINGS } from "@/i18n/en";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const gift = await getDb().query.gifts.findFirst({
    where: and(eq(gifts.shareToken, token), scopeAlive(gifts.deletedAt)),
    with: { sapling: { with: { species: true } } },
  }).catch(() => null);
  const title = gift ? `A tree for ${gift.recipientName} · GreenHQ` : "A gifted tree · GreenHQ";
  return {
    title,
    openGraph: { title, url: giftUrl(token), images: [`/g/${token}/opengraph-image`] },
  };
}

// Public gift page (PRD section 5.6): certificate card + claim + share.
export default async function GiftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (!checkRateLimit(`page:g:${ip}`, 120, 60_000).ok) {
    return (
      <main className="mx-auto max-w-xl w-full px-4 py-6">
        <div className="gs-card p-8 text-center">
          <span
            className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-[var(--gs-yellow-light)] flex items-center justify-center text-[#7a5200]"
            aria-hidden
          >
            <Hourglass size={22} />
          </span>
          <h1 className="font-bold text-lg">Slow down</h1>
          <p className="text-sm text-[var(--gs-muted)] mt-1">Too many requests. Try again in a minute.</p>
        </div>
      </main>
    );
  }
  const db = getDb();
  const gift = await db.query.gifts.findFirst({
    where: and(eq(gifts.shareToken, token), scopeAlive(gifts.deletedAt)),
    with: { sapling: { with: { species: true, project: { columns: { id: true, name: true, startDate: true } } } } },
  });
  if (!gift) notFound();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, gift.orgId),
    columns: { name: true, logoUrl: true, brandColor: true },
  });
  const gifter = gift.giftedByUserId
    ? await db.query.users.findFirst({
        where: eq(users.id, gift.giftedByUserId),
        columns: { name: true },
      })
    : null;
  const brand = org?.brandColor ?? "#2e7d32";
  // Own planted date, else the project's plantation-start date.
  const planted = effectivePlantedAt(gift.sapling?.plantedAt, gift.sapling?.project?.startDate);

  const details: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
  }[] = [
    {
      icon: <User size={15} aria-hidden />,
      label: STRINGS.gift.giftedBy,
      value: gifter?.name ?? org?.name ?? "Someone",
    },
    {
      icon: <Heart size={15} aria-hidden />,
      label: STRINGS.gift.giftedTo,
      value: gift.recipientName,
    },
    {
      icon: <Leaf size={15} aria-hidden />,
      label: "Species",
      value: gift.sapling?.species?.commonName ?? "Young tree",
    },
    ...(planted
      ? [
          {
            icon: <CalendarDays size={15} aria-hidden />,
            label: "Planted",
            value: <FormattedDate value={planted} />,
          },
        ]
      : []),
    {
      icon: <PackagePlus size={15} aria-hidden />,
      label: "Registered",
      value: <FormattedDate value={gift.sapling ? gift.sapling.createdAt : null} />,
    },
    {
      icon: <GiftIcon size={15} aria-hidden />,
      label: "Gifted on",
      value: <FormattedDate value={gift.createdAt} />,
    },
    {
      icon: <Sprout size={15} aria-hidden />,
      label: "Tree",
      value: <ActionLink href={`/t/${gift.sapling?.nanoid}`}>View growth</ActionLink>,
    },
  ];

  return (
    <main className="mx-auto max-w-xl w-full px-4 py-6">
      <article className="gs-card overflow-hidden" aria-label="Tree gift certificate">
        {/* Brand flourish */}
        <div aria-hidden className="h-1.5 w-full" style={{ background: brand }} />
        <div className="p-6 sm:p-8">
          {/* Org identity */}
          <div className="flex items-center justify-center gap-3">
            {org?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt={`${org?.name ?? "Organization"} logo`} width={44} height={44} className="rounded-2xl shrink-0" />
            ) : (
              <span
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0"
                style={{ background: `${brand}14`, color: brand }}
                aria-hidden
              >
                {(org?.name ?? "G").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="text-left min-w-0">
              <p className="font-bold leading-tight truncate">{org?.name ?? "GreenHQ"}</p>
              <p className="text-[0.7rem] tracking-[0.18em] uppercase text-[var(--gs-muted)]">Tree Gift Certificate</p>
            </div>
          </div>

          {/* Hero */}
          <div className="relative text-center mt-6">
            <GiftIcon
              size={190}
              aria-hidden
              className="absolute left-1/2 top-2 -translate-x-1/2 pointer-events-none select-none"
              style={{ color: `${brand}10` }}
            />
            <span
              className="relative mx-auto w-20 h-20 rounded-[1.75rem] flex items-center justify-center"
              style={{ background: brand, boxShadow: `0 12px 32px ${brand}55, inset 0 2px 0 rgb(255 255 255 / 0.25), 0 0 0 8px ${brand}14` }}
            >
              <GiftIcon size={38} aria-hidden color="#fff" />
            </span>
            <div className="relative flex items-center gap-3 mt-6 max-w-[16rem] mx-auto" aria-hidden>
              <span className="h-px flex-1 bg-[var(--gs-line)]" />
              <p className="text-[0.7rem] tracking-[0.22em] uppercase text-[var(--gs-muted)]">For</p>
              <span className="h-px flex-1 bg-[var(--gs-line)]" />
            </div>
            <h1 className="relative text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] mt-2 text-balance">
              {gift.recipientName}
            </h1>
            {gift.message && (
              <p className="relative text-[0.95rem] text-[var(--gs-muted)] mt-3 max-w-md mx-auto leading-relaxed text-balance">
                “{gift.message}”
              </p>
            )}
            {gift.claimedAt && (
              <p className="relative mt-4">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-3 py-1.5"
                  style={{ background: "#e6f2e7", color: "var(--gs-brand-ink)" }}
                >
                  <BadgeCheck size={14} aria-hidden />
                  Claimed <FormattedDate value={gift.claimedAt} />
                </span>
              </p>
            )}
          </div>

          {/* Details */}
          <dl className="mt-7 rounded-3xl bg-[var(--gs-bg)] p-2 sm:p-3 flex flex-col divide-y divide-[var(--gs-line)]">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="inline-flex items-center gap-2.5 text-sm text-[var(--gs-muted)] min-w-0">
                  <span
                    className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0"
                    style={{ color: brand }}
                    aria-hidden
                  >
                    {d.icon}
                  </span>
                  {d.label}
                </dt>
                <dd className="font-semibold text-sm text-[var(--gs-ink)] text-right shrink-0 max-w-[55%] truncate">
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>

          {gift.sapling?.lat != null && (
            <div className="mt-4 rounded-3xl overflow-hidden ring-1 ring-[var(--gs-line)]">
              <GiftMap lat={gift.sapling.lat} lng={gift.sapling.lng!} status={gift.sapling.status} />
            </div>
          )}

          {/* Claim */}
          <div
            className="mt-4 rounded-3xl p-4 sm:p-5"
            style={{ background: `${brand}0F`, border: `1px solid ${brand}30` }}
          >
            <h2 className="font-bold text-sm inline-flex items-center gap-2 text-[var(--gs-ink)]">
              <GiftIcon size={15} aria-hidden style={{ color: brand }} />
              {STRINGS.gift.claim}
            </h2>
            <div className="mt-1">
              <ClaimIsland token={token} claimed={!!gift.claimedAt} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-5 no-print items-center">
            <PrintButton label={STRINGS.gift.certificate} />
            <ActionLink href="/">{STRINGS.gift.plantYourOwn}</ActionLink>
          </div>
        </div>
      </article>
      <footer className="text-center text-xs text-[var(--gs-muted)] mt-6">
        <Link href="/">GreenHQ: Plant. Track. Gift.</Link>
      </footer>
    </main>
  );
}
