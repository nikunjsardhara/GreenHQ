// Soft delete everywhere (PRD §3.2): deleted rows vanish from default
// queries, survive in storage, and come back on restore.
import { expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { projects, saplings } from "@/db/schema";
import { scopeOrg, softDelete } from "@/lib/tenant";
import { describeDb, isolated, makeSapling, seedOrg } from "./helpers";

describeDb("soft delete", () => {
  test("soft-deleted projects disappear from scoped lists but still exist", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      await tx.update(projects).set(softDelete(seed.userId)).where(eq(projects.id, seed.projectId));

      const listed = await tx.query.projects.findMany({
        where: scopeOrg(projects.orgId, seed.orgId, projects.deletedAt),
      });
      expect(listed).toHaveLength(0);

      const stored = await tx.query.projects.findFirst({ where: eq(projects.id, seed.projectId) });
      expect(stored?.deletedAt).toBeInstanceOf(Date);
      expect(stored?.deletedBy).toBe(seed.userId);
    });
  });

  test("restore (deleted_at → null) makes rows visible again", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      const s = await makeSapling(tx, seed);
      await tx.update(saplings).set(softDelete(seed.userId)).where(eq(saplings.id, s.id));
      expect(
        await tx.query.saplings.findMany({ where: scopeOrg(saplings.orgId, seed.orgId, saplings.deletedAt) }),
      ).toHaveLength(0);

      await tx.update(saplings).set({ deletedAt: null, deletedBy: null }).where(eq(saplings.id, s.id));
      const back = await tx.query.saplings.findMany({
        where: scopeOrg(saplings.orgId, seed.orgId, saplings.deletedAt),
      });
      expect(back.map((r) => r.id)).toEqual([s.id]);
    });
  });

  test("withDeleted-style raw queries still see archived rows (admin restore path)", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      await tx.update(projects).set(softDelete(seed.userId)).where(eq(projects.id, seed.projectId));
      const all = await tx.query.projects.findMany({ where: eq(projects.orgId, seed.orgId) });
      expect(all.map((p) => p.id)).toEqual([seed.projectId]);
    });
  });
});
