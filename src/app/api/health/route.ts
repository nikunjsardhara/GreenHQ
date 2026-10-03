import { NextResponse } from "next/server";
import { getSql } from "@/db";
import { api } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/health, public connectivity diagnostic (no secrets in output).
// Visit this in the browser on a broken deploy: it reports whether the app
// can reach Postgres and which required env vars are present.
export const GET = api(async () => {
  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);

  let db: string = "up";
  let dbError: string | null = null;
  try {
    await withTimeout(getSql()`select 1`, 10000);
  } catch (err) {
    db = "down";
    // Never leak connection details: keep only a short, redacted message.
    const msg = err instanceof Error ? err.message : String(err);
    dbError = msg.replace(/:\/\/[^@\s]+@/g, "://***@").slice(0, 200);
  }
  return NextResponse.json({
    ok: db === "up",
    db,
    dbError,
    env: {
      databaseUrl: Boolean(process.env.DATABASE_URL),
      authSecret: Boolean(process.env.AUTH_SECRET),
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  });
});
