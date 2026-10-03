// Notifications, PRD §6.8. Every event is persisted to `notifications`
// (in-app inbox + PWA push payload source). Email fan-out goes through
// Resend when RESEND_API_KEY is set; otherwise the email body is logged so
// development and tests stay fully offline-capable.
import { getDb } from "@/db";
import { notifications } from "@/db/schema";

export interface NotifyInput {
  orgId?: string | null;
  userId?: string | null;
  type: string;
  payload: Record<string, unknown>;
  email?: { to: string; subject: string; html: string } | null;
}

export async function notify(input: NotifyInput): Promise<void> {
  await getDb().insert(notifications).values({
    orgId: input.orgId ?? null,
    userId: input.userId ?? null,
    type: input.type,
    payload: input.payload,
  });
  if (input.email) await sendEmail(input.email);
}

interface Email {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "GreenHQ <no-reply@example.org>";
  if (!key) {
    console.log(`[email:dev] to=${email.to} subject=${email.subject}\n${email.html}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html }),
  });
  if (!res.ok) console.error("[email] resend failed", await res.text());
}
