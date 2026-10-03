import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { BottomNav } from "@/components/bottom-nav";
import { Logo } from "@/components/logo";
import { OrgLogo } from "@/components/org-logo";
import { SyncBadge } from "@/components/pwa";
import type { CurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

async function OrgCrumb({ orgId }: { orgId: string | null }) {
  if (!orgId) return <p className="text-sm text-[var(--gs-muted)] truncate">Platform administration</p>;
  const org = await getDb().query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  if (!org) return <p className="text-sm text-[var(--gs-muted)] truncate">Platform administration</p>;
  return (
    <span className="flex items-center gap-2 min-w-0">
      <OrgLogo name={org.name} logoUrl={org.logoUrl} size={28} rounded="rounded-lg" />
      <p className="text-sm text-[var(--gs-muted)] truncate">{org.name}</p>
    </span>
  );
}

function OrgCrumbSkeleton() {
  return <span className="h-4 w-28 rounded-full bg-[var(--gs-line)] animate-pulse" aria-hidden />;
}

// Shell paints instantly, org name streams in via Suspense so the first
// byte after login is just Logo + avatar + bottom nav, not a DB round-trip.
export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <>
      <header className="no-print bg-[var(--gs-bg)]">
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center gap-3">
          <Logo size={36} />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Suspense fallback={<OrgCrumbSkeleton />}>
              <OrgCrumb orgId={user.session.orgId} />
            </Suspense>
          </div>
          <Link href="/profile" className="w-10 h-10 rounded-full bg-[var(--gs-coral)] text-white flex items-center justify-center font-bold text-sm" aria-label="GreenHQ profile">
            {user.name.slice(0, 1).toUpperCase()}
          </Link>
          <SyncBadge />
        </div>
      </header>
      <main className="mx-auto max-w-3xl w-full px-5 pt-2 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
