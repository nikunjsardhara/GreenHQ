// Integration-test harness: dedicated test database + per-test rollback.
// DB test files import from here. They are skipped unless TEST_DATABASE_URL
// is set (`bun run test:db` sets it up and runs them).
import { describe } from "bun:test";
import { getDb, type Db } from "@/db";
import { organizations, projects, roles, saplings, species, users } from "@/db/schema";
import { newPublicId, qrSvg, saplingUrl } from "@/lib/qr";

const TEST_URL = process.env.TEST_DATABASE_URL;
if (TEST_URL) process.env.DATABASE_URL = TEST_URL;

/** Use `describeDb` instead of `describe` so files skip without a test DB. */
export const describeDb = TEST_URL ? describe : describe.skip;

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

class RollbackSignal extends Error {}

/** Runs fn inside a transaction that is always rolled back. */
export async function isolated(fn: (tx: Tx) => Promise<void>): Promise<void> {
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new RollbackSignal();
    });
  } catch (err) {
    if (!(err instanceof RollbackSignal)) throw err;
  }
}

let counter = 0;
const tag = () => `t${Date.now().toString(36)}${(counter++).toString(36)}`;

export interface SeedOrg {
  orgId: string;
  roleId: string;
  userId: string;
  projectId: string;
  speciesId: string;
}

/** Minimal tenant: org + role + user + project + global species. */
export async function seedOrg(tx: Tx, name = "acme"): Promise<SeedOrg> {
  const slug = `${name}-${tag()}`;
  const [org] = await tx.insert(organizations).values({ name: slug, slug }).returning();
  const [role] = await tx
    .insert(roles)
    .values({ orgId: org.id, name: "Admin", permissions: ["*"] })
    .returning();
  const [user] = await tx
    .insert(users)
    .values({ orgId: org.id, email: `${slug}@example.org`, passwordHash: "x", name: "Admin", status: "active", roleId: role.id })
    .returning();
  const [project] = await tx
    .insert(projects)
    .values({ orgId: org.id, name: "P", status: "active", targetCount: 10 })
    .returning();
  const [sp] = await tx
    .insert(species)
    .values({ orgId: null, commonName: `Neem ${tag()}`, category: "native", co2KgPerYear: 10 })
    .returning();
  return { orgId: org.id, roleId: role.id, userId: user.id, projectId: project.id, speciesId: sp.id };
}

/** One sapling row with a real server-side QR, like the bulk route makes. */
export async function makeSapling(tx: Tx, seed: SeedOrg, overrides: Partial<typeof saplings.$inferInsert> = {}) {
  const code = newPublicId();
  const [row] = await tx
    .insert(saplings)
    .values({
      orgId: seed.orgId,
      projectId: seed.projectId,
      speciesId: seed.speciesId,
      nanoid: code,
      qrSvg: await qrSvg(saplingUrl(code)),
      status: "registered",
      ...overrides,
    })
    .returning();
  return row;
}
