import { ActionLink } from "@/components/ui";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-xl w-full px-4 py-6">
      <h1 className="text-2xl font-bold">Terms of Use</h1>
      <div className="gs-card p-4 mt-3 text-sm flex flex-col gap-3">
        <p>By using GreenHQ you agree to:</p>
        <ul className="list-disc ml-5 flex flex-col gap-1">
          <li>Provide accurate planting records; organizations are responsible for their own data.</li>
          <li>Only gift trees you have the right to gift, and only share recipient details with their knowledge.</li>
          <li>Not scrape public QR/gift pages, rate limits are enforced (see fair-use).</li>
          <li>Location data you publish on public sapling pages is visible to anyone with the link.</li>
        </ul>
        <p>Records are soft-deleted (retained for audit) unless an organization confirms permanent removal.</p>
        <p><ActionLink href="/privacy">Privacy Policy</ActionLink></p>
      </div>
    </main>
  );
}
