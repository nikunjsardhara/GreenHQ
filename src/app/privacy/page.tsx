import { ActionLink } from "@/components/ui";

// PRD §6.16: the app collects GPS location and third-party personal data
// (gift recipients) who never signed up, this page must exist from day one.
export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-xl w-full px-4 py-6">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <div className="gs-card p-4 mt-3 text-sm flex flex-col gap-3">
        <p>GreenHQ helps NGOs track tree plantations. We collect the minimum data needed to do that:</p>
        <ul className="list-disc ml-5 flex flex-col gap-1">
          <li><strong>Account data:</strong> name, email and organization for sign-in.</li>
          <li><strong>Location data:</strong> GPS coordinates of planted saplings, captured by volunteers in the field. Sapling locations are shown on public QR profile pages at neighborhood precision.</li>
          <li><strong>Gift recipient data:</strong> a name (and optional contact/message) provided by the gifter. Recipients who never signed up can ask any participating organization to remove their data.</li>
          <li><strong>Photos:</strong> growth photos attached to saplings; may appear on public pages.</li>
        </ul>
        <p>Data is never sold. Deletion requests: contact the organization that planted the tree, listed on every public page.</p>
        <p><ActionLink href="/terms">Terms of Use</ActionLink></p>
      </div>
    </main>
  );
}
