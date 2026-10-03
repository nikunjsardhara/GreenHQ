// Lazy singleton Postgres client (postgres.js) shared by all server code.
// Wiring follows https://neon.com/docs/guides/nextjs (postgres.js section):
// one driver for both Neon (pooled connection string, SSL via
// `?sslmode=require` in DATABASE_URL) and local Postgres, so bulk-create
// transactions work identically everywhere. `prepare: false` is required for
// Neon's pooled connections and harmless locally. Neon Auth session
// verification is separate (JWKS, see src/lib/auth.ts).
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and run `bun run setup`.",
    );
  }
  return url;
}

/** Process-wide query client. Lazy so `next build` never connects at build time. */
export function getDb() {
  if (!dbInstance) {
    client = postgres(connectionString(), {
      max: 10,
      prepare: false, // required for Neon pooled connections; harmless locally
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;

/** Raw SQL escape hatch (migrations check, healthcheck). */
export function getSql() {
  getDb();
  return client!;
}

export * from "./schema";
