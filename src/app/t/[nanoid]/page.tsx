import { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  Building2,
  CalendarDays,
  FolderKanban,
  Gift as GiftIcon,
  Hourglass,
  Leaf,
  MapPin,
  PackagePlus,
  Sprout,
} from "lucide-react";
import { getDb } from "@/db";
import { organizations, saplingUpdates, saplings, zones } from "@/db/schema";
import { giftUrl, saplingUrl } from "@/lib/qr";
import { contrastText } from "@/lib/color";
import { zoneContainingPoint } from "@/lib/geo";
import { ActionLink, SaplingStatusBadge } from "@/components/ui";
import { FormattedDate } from "@/components/formatted-date";
import { effectivePlantedAt } from "@/lib/dates";
import { STRINGS } from "@/i18n/en";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";
import { PublicMap } from "./map";

export const dynamic = "force-dynamic";

// PRD §6.13: unauthenticated shareable pages get bot/scrape protection.
async function publicRateOk(): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  return checkRateLimit(`page:t:${ip}`, 120, 60_000).ok;
}

async function loadSapling(nanoid: string) {
  const db = getDb();
  const row = await db.query.saplings.findFirst({
    where: and(eq(saplings.nanoid, nanoid), scopeAlive(saplings.deletedAt)),
    with: {
      species: true,
      project: { columns: { id: true, name: true, startDate: true } },
      updates: { orderBy: [desc(saplingUpdates.recordedAt)], limit: 50 },
      gift: true,
    },
  });
  if (!row) return null;
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, row.orgId),
    columns: { name: true, logoUrl: true, brandColor: true },
  });
  return { row, org };
}

export async function generateMetadata({ params }: { params: Promise<{ nanoid: string }> }): Promise<Metadata> {
  const { nanoid } = await params;
  const data = await loadSapling(nanoid).catch(() => null);
  const species = data?.row.species?.commonName ?? "A planted tree";
  const title = `${species} · GreenHQ`;
  const description = data
    ? `Follow this ${species.toLowerCase()} (${data.row.status}), planted by ${data.org?.name ?? "a GreenHQ NGO"}.`
    : "A QR-tagged sapling tracked on GreenHQ.";
  return {
    title,
    description,
    openGraph: { title, description, url: saplingUrl(nanoid), images: [`/t/${nanoid}/opengraph-image`] },
  };
}

// Public sapling profile (PRD section 5.5): the QR scan destination. Unauthenticated,
// SSR, org-branded, with OG tags for WhatsApp/social.
export default async function PublicSaplingPage({ params }: { params: Promise<{ nanoid: string }> }) {
  const { nanoid } = await params;
  if (!(await publicRateOk())) {
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
  const data = await loadSapling(nanoid);
  if (!data) notFound();
  const { row, org } = data;
  const brand = org?.brandColor ?? "#2e7d32";
  const zoneRows = row.project
    ? (
        await getDb().query.zones.findMany({
          where: and(eq(zones.projectId, row.project.id), scopeAlive(zones.deletedAt)),
          columns: { name: true, polygonGeojson: true },
        })
      ).map((z) => ({
        name: z.name,
        polygonGeojson: z.polygonGeojson as { coordinates?: [number, number][][] } | null,
      }))
    : [];
  const zoneName = zoneContainingPoint(row.lat, row.lng, zoneRows);
  // Own planted date, else the project's plantation-start date.
  const planted = effectivePlantedAt(row.plantedAt, row.project?.startDate);
  const statusLabel =
    STRINGS.sapling.status[row.status as keyof typeof STRINGS.sapling.status] ?? row.status;

  const details: { icon: ReactNode; label: string; value: ReactNode }[] = [
    {
      icon: <FolderKanban size={15} aria-hidden />,
      label: "Project",
      value: (
        <>
          {row.project?.name ?? "-"}
          {row.project?.startDate && (
            <span className="block text-xs font-normal text-[var(--gs-muted)]">
              Plantation starts <FormattedDate value={row.project.startDate} />
            </span>
          )}
        </>
      ),
    },
    ...(zoneName
      ? [{ icon: <MapPin size={15} aria-hidden />, label: "Zone", value: zoneName }]
      : []),
    {
      icon: <Building2 size={15} aria-hidden />,
      label: "Organization",
      value: org?.name ?? "-",
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
      value: <FormattedDate value={row.createdAt} />,
    },
    ...(row.gift
      ? [
          {
            icon: <GiftIcon size={15} aria-hidden />,
            label: "Gift",
            value: <ActionLink href={giftUrl(row.gift.shareToken)}>Gifted to {row.gift.recipientName}</ActionLink>,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-xl w-full px-4 py-6">
      <header className="gs-card overflow-hidden">
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
              <p className="text-[0.7rem] tracking-[0.18em] uppercase text-[var(--gs-muted)]">Planting organization</p>
            </div>
          </div>

          {/* Hero */}
          <div className="relative text-center mt-6">
            <Leaf
              size={190}
              aria-hidden
              className="absolute left-1/2 top-2 -translate-x-1/2 pointer-events-none select-none"
              style={{ color: `${brand}10` }}
            />
            <span
              className="relative mx-auto w-20 h-20 rounded-[1.75rem] flex items-center justify-center"
              style={{ background: brand, boxShadow: `0 12px 32px ${brand}55, inset 0 2px 0 rgb(255 255 255 / 0.25), 0 0 0 8px ${brand}14` }}
            >
              <Sprout size={38} aria-hidden color="#fff" />
            </span>
            <h1 className="relative text-3xl sm:text-4xl font-bold tracking-tight text-[var(--gs-ink)] mt-5 text-balance">
              {row.species?.commonName ?? "Young tree"}
            </h1>
            {row.species?.scientificName && (
              <p className="relative text-sm italic text-[var(--gs-muted)] mt-1">{row.species.scientificName}</p>
            )}
            <p className="relative mt-3 flex items-center justify-center gap-2 flex-wrap">
              <SaplingStatusBadge status={row.status} label={statusLabel} />
              {planted && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--gs-muted)]">
                  <CalendarDays size={12} aria-hidden />
                  Planted <FormattedDate value={planted} />
                </span>
              )}
            </p>
            {!row.gift && (
              <p className="relative mt-4">
                <Link
                  href={`/gifts/new?sapling=${row.nanoid}`}
                  className="gs-chip inline-flex items-center gap-1.5 !px-5 !py-3"
                  style={{ background: brand, color: contrastText(brand) }}
                >
                  <GiftIcon size={15} aria-hidden />
                  Gift this tree
                </Link>
              </p>
            )}
          </div>
        </div>
      </header>

      {row.lat != null && row.lng != null && (
        <section aria-label="Location" className="mt-4">
          <div className="rounded-3xl overflow-hidden ring-1 ring-[var(--gs-line)]">
            <PublicMap lat={row.lat} lng={row.lng} status={row.status} />
          </div>
        </section>
      )}

      <section aria-label="Details" className="mt-4">
        <dl className="gs-card p-2 sm:p-3 flex flex-col divide-y divide-[var(--gs-line)]">
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
              <dd className="font-semibold text-sm text-[var(--gs-ink)] text-right shrink-0 max-w-[55%]">
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Growth timeline" className="mt-6">
        <h2 className="text-lg font-bold mb-3 inline-flex items-center gap-2 text-[var(--gs-ink)]">
          <Sprout size={18} aria-hidden />
          Growth timeline
        </h2>
        <ol className="flex flex-col gap-2.5">
          {row.updates.map((t) => (
            <li key={t.id} className="gs-card p-4">
              <p className="flex items-center justify-between gap-3">
                <SaplingStatusBadge
                  status={t.status}
                  label={STRINGS.sapling.status[t.status as keyof typeof STRINGS.sapling.status] ?? t.status}
                />
                <span className="text-xs text-[var(--gs-muted)] inline-flex items-center gap-1 shrink-0">
                  <CalendarDays size={12} aria-hidden />
                  <FormattedDate value={t.recordedAt} />
                </span>
              </p>
              {t.note && <p className="text-sm mt-2 leading-relaxed">{t.note}</p>}
              {t.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.photoUrl} alt={`Sapling photo (${t.status})`} className="mt-3 rounded-2xl max-h-56 w-full object-cover" loading="lazy" />
              )}
            </li>
          ))}
          {row.updates.length === 0 && (
            <li className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
              <Sprout size={15} aria-hidden />
              Planted recently. Photos coming soon.
            </li>
          )}
        </ol>
      </section>

      <footer className="text-center text-xs text-[var(--gs-muted)] mt-6">
        <Link href="/">GreenHQ - Plant Trees.</Link>
      </footer>
    </main>
  );
}
