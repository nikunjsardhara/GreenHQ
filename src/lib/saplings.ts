// Shared server-side sapling lookup (internal detail + mutations).
import { desc } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { saplingUpdates, saplings } from "@/db/schema";
import { scopeAlive } from "./tenant";

/** Find an alive sapling by public nanoid, optionally scoped to an org. */
export async function findSaplingByCode(orgId: string | null, nanoid: string) {
  const db = getDb();
  const where = orgId
    ? and(eq(saplings.nanoid, nanoid), eq(saplings.orgId, orgId), scopeAlive(saplings.deletedAt))
    : and(eq(saplings.nanoid, nanoid), scopeAlive(saplings.deletedAt));
  return db.query.saplings.findFirst({
    where,
    with: {
      species: true,
      project: true,
      updates: { orderBy: [desc(saplingUpdates.recordedAt)] },
      gift: true,
    },
  });
}
