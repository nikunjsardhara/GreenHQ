// Audit log writer, PRD §6.10. Fire-and-forget safe: audit failures are
// logged, never thrown, so they can't break the mutation being recorded.
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";

export interface AuditInput {
  orgId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await getDb().insert(auditLog).values({
      orgId: input.orgId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ?? null,
      after: input.after ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write entry", err);
  }
}
