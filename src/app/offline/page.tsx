import { WifiOff } from "lucide-react";
import { ActionLink } from "@/components/ui";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="gs-card p-8 max-w-sm text-center">
        <span className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-[var(--gs-yellow-light)] flex items-center justify-center text-[#7a5200]" aria-hidden>
          <WifiOff size={22} />
        </span>
        <h1 className="text-xl font-bold">You are offline</h1>
        <p className="text-sm text-[var(--gs-muted)] mt-2">
          Field capture keeps working. Scans and status updates queue on this device and sync when you reconnect.
        </p>
        <div className="mt-2 flex justify-center">
          <ActionLink href="/scan">Open field scan</ActionLink>
        </div>
      </div>
    </main>
  );
}
