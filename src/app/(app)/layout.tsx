import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

// Authenticated app shell (PRD §8). The shell itself renders header/nav;
// pages inside only worry about content.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u) redirect("/login?expired=1");
  return <AppShell user={u}>{children}</AppShell>;
}
