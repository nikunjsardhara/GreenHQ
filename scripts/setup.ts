// One-command dev setup, `bun run setup`.
// 1. Creates .env from .env.example if missing. 2. Pushes the Drizzle schema
//    (verifies the database is reachable). 3. Seeds demo data (idempotent).
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const envPath = join(root, ".env");

if (!existsSync(envPath)) {
  copyFileSync(join(root, ".env.example"), envPath);
  console.log("Created .env from .env.example, edit DATABASE_URL if needed.");
}

function run(cmd: string, args: string[], label: string): void {
  console.log(`\n$ ${cmd} ${args.join(" ")}  (${label})`);
  const res = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (res.status !== 0) throw new Error(`${label} failed with exit code ${res.status}`);
}

try {
  run("bunx", ["drizzle-kit", "push"], "push schema to database");
  run("bun", ["scripts/seed.ts"], "seed demo data");
  console.log("\nSetup complete. Next:");
  console.log("  bun run dev        # start the app at http://localhost:3000");
  console.log("  bun test           # run unit tests");
} catch (err) {
  console.error(
    "\nSetup failed. Most likely the database is unreachable, check DATABASE_URL in .env",
    "(local Postgres `createdb GreenHQ`, or a Neon pooled connection string).",
  );
  throw err;
}
