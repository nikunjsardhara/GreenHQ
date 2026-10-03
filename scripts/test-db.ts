// Sets up an isolated Postgres database for integration tests and runs them.
// Usage: `bun run test:db`  (or TEST_DATABASE_URL=… bun test tests/db)
// The database is created if missing, the Drizzle schema is pushed, then
// `bun test tests/db` runs with TEST_DATABASE_URL set. Each test rolls its
// own transaction back (see tests/db/helpers.ts), so no residue remains.
import postgres from "postgres";
import { spawnSync } from "node:child_process";

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://nikunj@localhost:5432/GreenHQ_test";

const target = new URL(TEST_URL);
const dbName = target.pathname.replace(/^\//, "");
if (!dbName) throw new Error("TEST_DATABASE_URL must include a database name.");

const adminUrl = new URL(TEST_URL);
adminUrl.pathname = "/postgres";

console.log(`test db: ${target.host}${target.pathname}`);
const admin = postgres(adminUrl.toString(), { max: 1 });
try {
  await admin.unsafe(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  console.log(`created database ${dbName}`);
} catch (err) {
  if ((err as { code?: string }).code !== "42P04") throw err; // already exists
  console.log(`database ${dbName} exists`);
} finally {
  await admin.end();
}

const push = spawnSync("bunx", ["drizzle-kit", "push"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: TEST_URL },
});
if (push.status !== 0) throw new Error("drizzle-kit push failed");

const run = spawnSync("bun", ["test", "tests/db"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, TEST_DATABASE_URL: TEST_URL },
});
process.exit(run.status ?? 1);
