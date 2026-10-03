// Tenant isolation at the query layer (PRD §3.1): rows from org A must be
// invisible to org B's scoped queries, enforced by SQL, not by the UI.
import { expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { projects, saplings, users } from "@/db/schema";
import { scopeOrg } from "@/lib/tenant";
import { describeDb, isolated, makeSapling, seedOrg } from "./helpers";

describeDb("tenant isolation", () => {
  test("scoped project queries see only their own org", async () => {
    await isolated(async (tx) => {
      const a = await seedOrg(tx, "alpha");
      const b = await seedOrg(tx, "beta");
      const mine = await tx.query.projects.findMany({
        where: scopeOrg(projects.orgId, a.orgId, projects.deletedAt),
      });
      expect(mine.map((p) => p.id)).toEqual([a.projectId]);
      expect(mine.every((p) => p.orgId === a.orgId)).toBe(true);
      expect(mine.some((p) => p.id === b.projectId)).toBe(false);
    });
  });

  test("scoped sapling queries see only their own org", async () => {
    await isolated(async (tx) => {
      const a = await seedOrg(tx, "alpha");
      const b = await seedOrg(tx, "beta");
      const sa = await makeSapling(tx, a);
      await makeSapling(tx, b);
      const mine = await tx.query.saplings.findMany({
        where: scopeOrg(saplings.orgId, a.orgId, saplings.deletedAt),
      });
      expect(mine.map((s) => s.id)).toEqual([sa.id]);
    });
  });

  test("user roster queries are org-pinned", async () => {
    await isolated(async (tx) => {
      const a = await seedOrg(tx, "alpha");
      await seedOrg(tx, "beta");
      const roster = await tx.query.users.findMany({
        where: scopeOrg(users.orgId, a.orgId, users.deletedAt),
      });
      expect(roster).toHaveLength(1);
      expect(roster[0].id).toBe(a.userId);
    });
  });

  test("a direct id lookup still cannot cross orgs when composed with scope", async () => {
    await isolated(async (tx) => {
      const a = await seedOrg(tx, "alpha");
      const b = await seedOrg(tx, "beta");
      const leaked = await tx.query.projects.findFirst({
        where: and(eq(projects.id, b.projectId), scopeOrg(projects.orgId, a.orgId, projects.deletedAt)),
      });
      expect(leaked).toBeUndefined();
    });
  });
});
