// Uniqueness invariants the API layer relies on: public nanoids, one gift
// per sapling, one account per email, one share token per gift.
import { expect, test } from "bun:test";
import { gifts, saplings, users } from "@/db/schema";
import { newPublicId } from "@/lib/qr";
import { describeDb, isolated, makeSapling, seedOrg } from "./helpers";

async function rejects(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error("expected query to reject, but it succeeded");
}

/** Drizzle wraps Postgres errors: the unique-violation detail lives on .cause. */
export function isUniqueViolation(err: unknown): boolean {
  const cause = (err as { cause?: { code?: string; message?: string } }).cause;
  return cause?.code === "23505" || /unique|duplicate/i.test(`${cause?.message ?? ""} ${String(err)}`);
}

describeDb("uniqueness constraints", () => {
  test("duplicate sapling nanoids are rejected", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      const first = await makeSapling(tx, seed);
      const err = await rejects(makeSapling(tx, seed, { nanoid: first.nanoid }));
      expect(isUniqueViolation(err)).toBe(true);
    });
  });

  test("a sapling can only be gifted once", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      const s = await makeSapling(tx, seed);
      await tx.insert(gifts).values({
        orgId: seed.orgId,
        saplingId: s.id,
        recipientName: "Riya",
        shareToken: `${newPublicId()}Z1`,
      });
      const err = await rejects(
        tx.insert(gifts).values({
          orgId: seed.orgId,
          saplingId: s.id,
          recipientName: "Aarav",
          shareToken: `${newPublicId()}Z2`,
        }),
      );
      expect(isUniqueViolation(err)).toBe(true);
    });
  });

  test("duplicate gift share tokens are rejected", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      const token = `${newPublicId()}TT`;
      await tx.insert(gifts).values({
        orgId: seed.orgId,
        saplingId: (await makeSapling(tx, seed)).id,
        recipientName: "Riya",
        shareToken: token,
      });
      const err = await rejects(
        tx.insert(gifts).values({
          orgId: seed.orgId,
          saplingId: (await makeSapling(tx, seed)).id,
          recipientName: "Aarav",
          shareToken: token,
        }),
      );
      expect(isUniqueViolation(err)).toBe(true);
    });
  });

  test("duplicate user emails are rejected", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      const err = await rejects(
        tx.insert(users).values({
          orgId: seed.orgId,
          email: (await tx.query.users.findFirst())!.email,
          passwordHash: "x",
          name: "Dupe",
          status: "invited",
        }),
      );
      expect(isUniqueViolation(err)).toBe(true);
    });
  });

  test("bulk insert of 200 unique nanoids succeeds in one transaction", async () => {
    await isolated(async (tx) => {
      const seed = await seedOrg(tx);
      const rows = Array.from({ length: 200 }, () => ({
        orgId: seed.orgId,
        projectId: seed.projectId,
        speciesId: seed.speciesId,
        nanoid: newPublicId(),
        qrSvg: "<svg/>",
        status: "registered" as const,
      }));
      const inserted = await tx.insert(saplings).values(rows).returning({ id: saplings.id });
      expect(inserted).toHaveLength(200);
    });
  });
});
