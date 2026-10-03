import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { Landing } from "@/components/landing";

export const dynamic = "force-dynamic";

// Home: the public landing page for visitors, the dashboard (in the
// identical app shell) for signed-in users. All other authenticated routes
// live under (app) and keep their own guard.
export default async function RootPage() {
  const u = await getCurrentUser();
  if (!u) return <Landing />;
  return (
    <AppShell user={u}>
      <Dashboard user={u} />
    </AppShell>
  );
}
