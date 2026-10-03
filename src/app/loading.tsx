import { PageSkeleton } from "@/components/page-skeleton";

// Shown automatically during navigations on public/auth pages.
export default function RootLoading() {
  return (
    <main className="mx-auto max-w-3xl w-full px-5 pt-6 pb-28">
      <PageSkeleton />
    </main>
  );
}
