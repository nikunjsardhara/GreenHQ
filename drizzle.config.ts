import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit needs a direct connection string: Neon pooled URL
    // (from `bunx neon init` / console.neon.tech → Connect) or local Postgres.
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/GreenHQ",
  },
});
