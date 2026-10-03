// Bulk creation is one transaction (PRD §5.4): a single bad row must roll
// back the whole batch, and the audit trail must record the operation.
import { expect, test } from "bun:test";
import { count } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, organizations, saplings, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { newPublicId } from "@/lib/qr";
import { scopeOrg } from "@/lib/tenant";
import { describeDb, isolated, seedOrg } from "./helpers";

describeDb("bulk transactions", () => {
  test("a duplicate nanoid aborts the entire batch (all-or-nothing)", async () => {
    const db = getDb();
    try {
      await db.transaction(async (tx) => {
        const seed = await seedOrg(tx);
        const taken = newPublicId();
        await tx.insert(saplings).values({
          orgId: seed.orgId,
          projectId: seed.projectId,
          speciesId: seed.speciesId,
          nanoid: taken,
          qrSvg: "<svg/>",
          status: "registered",
        });
        // Second insert collides → whole transaction (incl. the org) rolls back.
        await tx.insert(saplings).values({
          orgId: seed.orgId,
          projectId: seed.projectId,
          speciesId: seed.speciesId,
          nanoid: taken,
          qrSvg: "<svg/>",
          status: "registered",
        });
      });
      throw new Error("expected transaction to abort");
    } catch (err) {
      const cause = (err as { cause?: { code?: string } }).cause;
      expect(cause?.code ?? String(err)).toMatch(/23505|unique|duplicate/i);
    }
  });

  test("logAudit persists who/what/when/before/after", async () => {
    // Committed fixture: logAudit writes on its own connection, so the
    // referenced org/user must be visible outside any test transaction.
    const db = getDb();
    const slug = `audit-probe-${Date.now().toString(36)}`;
    const [org] = await db.insert(organizations).values({ name: slug, slug }).returning();
    const [user] = await db
      .insert(users)
      .values({ orgId: org.id, email: `${slug}@example.org`, passwordHash: "x", name: "U", status: "active" })
      .returning();
    try {
      await logAudit({
        orgId: org.id,
        userId: user.id,
        action: "sapling.bulk_create",
        entityType: "project",
        entityId: "proj-1",
        after: { count: 3, mode: "blank" },
      });
      const entries = await db.query.auditLog.findMany({
        where: and(eq(auditLog.orgId, org.id), eq(auditLog.action, "sapling.bulk_create")),
      });
      expect(entries).toHaveLength(1);
      expect(entries[0].userId).toBe(user.id);
      expect(entries[0].after).toEqual({ count: 3, mode: "blank" });
      expect(entries[0].createdAt).toBeInstanceOf(Date);
    } finally {
      await db.delete(auditLog).where(eq(auditLog.orgId, org.id));
      await db.delete(users).where(eq(users.id, user.id));
      await db.delete(organizations).where(eq(organizations.id, org.id));
    }
  });

  test("usage-style counting matches inserted rows", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      await tx.insert(saplings).values(
        Array.from({ length: 7 }, () => ({
          orgId: seed.orgId,
          projectId: seed.projectId,
          speciesId: seed.speciesId,
          nanoid: newPublicId(),
          qrSvg: "<svg/>",
          status: "registered" as const,
        })),
      );
      const [{ n }] = await tx
        .select({ n: count() })
        .from(saplings)
        .where(scopeOrg(saplings.orgId, seed.orgId, saplings.deletedAt));
      expect(Number(n)).toBe(7);
    });
  });
});
