import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, FolderKanban, Gift, History } from "lucide-react";
import { getDb } from "@/db";
import { organizations, users, zones } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { findSaplingByCode } from "@/lib/saplings";
import { giftUrl, saplingUrl } from "@/lib/qr";
import { zoneContainingPoint } from "@/lib/geo";
import { effectivePlantedAt } from "@/lib/dates";
import { OatTabs } from "@/components/oat";
import { FormattedDate } from "@/components/formatted-date";
import { OrgLogo } from "@/components/org-logo";
import { QrCaption, QrPrintButton } from "@/components/qr-caption";
import { ActionLink, PageHeader } from "@/components/ui";
import { STRINGS } from "@/i18n/en";
import { StatusStepper } from "./stepper";
import { EditLocation } from "./edit-location";
import { EditPlanting } from "./edit-planting";
import { and, eq } from "drizzle-orm";
import { scopeAlive } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Internal sapling detail: every record linked to the sapling (organization,
// project, zone, species, location, planter, gift, public page, QR.
export default async function SaplingDetailPage({ params }: { params: Promise<{ nanoid: string }> }) {
  const { nanoid } = await params;
  const u = (await getCurrentUser())!;
  const orgId = u.session.isSuperAdmin ? null : u.session.orgId;
  const s = await findSaplingByCode(orgId, nanoid);
  if (!s || (!u.session.isSuperAdmin && s.orgId !== u.session.orgId)) notFound();

  const db = getDb();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, s.orgId),
    columns: { id: true, name: true, logoUrl: true },
  });
  const planter = s.plantedBy
    ? await db.query.users.findFirst({ where: eq(users.id, s.plantedBy), columns: { name: true } })
    : null;
  const zoneRows = s.project
    ? (
        await db.query.zones.findMany({
          where: and(eq(zones.projectId, s.project.id), scopeAlive(zones.deletedAt)),
          columns: { name: true, polygonGeojson: true },
        })
      ).map((z) => ({
        name: z.name,
        polygonGeojson: z.polygonGeojson as { coordinates?: [number, number][][] } | null,
      }))
    : [];
  const zoneName = zoneContainingPoint(s.lat, s.lng, zoneRows);

  const timeline = [...(s.updates ?? [])].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  // Own planted date, else the project's plantation-start date (a real date
  // instead of a dash). The Planted row renders only when one exists.
  const planted = effectivePlantedAt(s.plantedAt, s.project?.startDate);

  return (
    <div>
      <PageHeader
        title={s.nanoid}
        subtitle={`${s.species?.commonName ?? "Unassigned species"} · ${STRINGS.sapling.status[s.status as keyof typeof STRINGS.sapling.status]}`}
        subtitleClassName="text-xl font-bold text-black mt-1"
        actions={
          !s.gift && hasPermission(u.permissions, "gift.create") ? (
            <Link href={`/gifts/new?sapling=${s.nanoid}`} className="gs-chip inline-flex items-center gap-1">
              <Gift size={14} aria-hidden /> {STRINGS.sapling.giftThisTree}
            </Link>
          ) : undefined
        }
      />
      <div className="gs-card px-4 py-3 -mt-2 mb-3 flex items-center gap-3">
        {org?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logoUrl} alt={`${org?.name ?? "Organization"} logo`} width={40} height={40} className="rounded-lg shrink-0" />
        ) : (
          <span className="w-10 h-10 rounded-xl bg-[var(--gs-mint-light)] flex items-center justify-center text-[var(--gs-brand)] shrink-0" aria-hidden>
            <Building2 size={20} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-bold leading-tight truncate">{org?.name ?? "Unknown organization"}</p>
          <p className="text-sm text-[var(--gs-muted)] truncate inline-flex items-center gap-1">
            {s.project ? (
              <>
                <FolderKanban size={13} aria-hidden className="shrink-0" />
                <Link href={`/projects/${s.project.id}`}>{s.project.name}</Link>
              </>
            ) : (
              "No project"
            )}
            {s.project?.startDate ? (<> · since <FormattedDate value={s.project.startDate} /></>) : ""}
            {zoneName ? ` · ${zoneName}` : ""}
          </p>
        </div>
      </div>

      <OatTabs
        labelledBy="Sapling sections"
        tabs={[
          {
            id: "timeline",
            label: "Timeline",
            content: (
              <div>
                <div className="gs-card p-4 mb-3">
                  <StatusStepper
                    nanoid={s.nanoid}
                    current={s.status}
                    canUpdate={hasPermission(u.permissions, "sapling.update_status")}
                    canOverride={hasPermission(u.permissions, "sapling.override_status")}
                  />
                </div>
                <ol className="flex flex-col gap-2">
                  {timeline.map((t) => (
                    <li key={t.id} className="gs-card p-3">
                      <p className="text-sm font-semibold">{STRINGS.sapling.status[t.status as keyof typeof STRINGS.sapling.status] ?? t.status} · <FormattedDate value={t.recordedAt} /></p>
                      {t.note && <p className="text-sm">{t.note}</p>}
                      {t.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.photoUrl} alt={`Sapling photo (${t.status})`} className="mt-2 rounded-lg max-h-48" loading="lazy" />
                      )}
                    </li>
                  ))}
                  {timeline.length === 0 && (
                    <li className="text-sm text-[var(--gs-muted)] inline-flex items-center gap-1.5">
                      <History size={15} aria-hidden />
                      No growth updates yet.
                    </li>
                  )}
                </ol>
              </div>
            ),
          },
          {
            id: "details",
            label: "Details",
            content: (
              <div>
                <dl className="gs-card p-4 text-sm flex flex-col gap-2">
                  <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Organization</dt><dd className="font-semibold text-right inline-flex items-center gap-2">{org?.logoUrl && <OrgLogo name={org?.name ?? "Organization"} logoUrl={org.logoUrl} size={22} rounded="rounded-md" />}{org?.name ?? "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Project</dt><dd className="font-semibold text-right">{s.project ? <><Link href={`/projects/${s.project.id}`}>{s.project.name}</Link>{s.project.startDate && <span className="block text-xs font-normal text-[var(--gs-muted)]">Plantation starts <FormattedDate value={s.project.startDate} /></span>}</> : "-"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Zone</dt><dd className="font-semibold text-right text-base">{zoneName ?? (s.lat != null ? "Outside named zones" : "-")}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Species</dt><dd className="font-semibold text-right">{s.species ? `${s.species.commonName}${s.species.scientificName ? ` (${s.species.scientificName})` : ""}` : "Unassigned"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Location</dt><dd className="font-semibold text-right text-base">{s.lat != null ? `${s.lat.toFixed(5)}, ${s.lng?.toFixed(5)}${s.gpsAccuracyM ? ` (±${Math.round(s.gpsAccuracyM)} m)` : ""}` : "Not set. Activate in field"}</dd></div>
                  {planted && (
                    <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Planted</dt><dd className="font-semibold text-right"><FormattedDate value={planted} />{planter ? ` by ${planter.name}` : ""}</dd></div>
                  )}
                  <div className="flex justify-between gap-3"><dt className="text-[var(--gs-muted)]">Registered</dt><dd className="font-semibold text-right"><FormattedDate value={s.createdAt} /></dd></div>
                  <div className="flex justify-between gap-3 items-center"><dt className="text-[var(--gs-muted)]">Public page</dt><dd className="text-right"><ActionLink href={saplingUrl(s.nanoid)}>Open QR profile</ActionLink></dd></div>
                  <div className="flex justify-between gap-3 items-center"><dt className="text-[var(--gs-muted)]">Gift</dt><dd className="font-semibold text-right">{s.gift ? <ActionLink href={giftUrl(s.gift.shareToken)}>Gifted to {s.gift.recipientName}</ActionLink> : "Not gifted"}</dd></div>
                </dl>
                <EditLocation
                  nanoid={s.nanoid}
                  currentLat={s.lat}
                  currentLng={s.lng}
                  currentAccuracy={s.gpsAccuracyM}
                  canEdit={hasPermission(u.permissions, "sapling.update_status")}
                  status={s.status as "registered" | "planted" | "growing" | "mature" | "lost" | "replaced"}
                />
                <EditPlanting
                  nanoid={s.nanoid}
                  currentSpeciesId={s.species?.id ?? null}
                  plantedAt={s.plantedAt}
                  canEdit={hasPermission(u.permissions, "sapling.update_status")}
                />
              </div>
            ),
          },
          {
            id: "qr",
            label: "QR code",
            content: (
              <div className="gs-card p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/saplings/${s.nanoid}/qr`} alt={`QR code for sapling ${s.nanoid}`} className="mx-auto" width={220} height={220} />
                <p className="font-mono font-bold mt-2">{s.nanoid}</p>
                <QrCaption
                  orgName={org?.name}
                  speciesName={s.species?.commonName}
                  plantedAt={s.plantedAt}
                  createdAt={s.createdAt}
                  status={s.status}
                  projectStartDate={s.project?.startDate}
                />
                <p className="text-xs text-[var(--gs-muted)] break-all mt-1">{saplingUrl(s.nanoid)}</p>
                <QrPrintButton />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
