// Tenant isolation + soft-delete helpers, PRD §3.1 / §3.2.
// Every list/detail query MUST scope by organization_id and filter
// deleted_at IS NULL. These helpers make the secure pattern the default.
import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/** org_id match + alive, for tenant-owned tables. */
export function scopeOrg(orgCol: PgColumn, orgId: string, deletedCol: PgColumn): SQL {
  return and(eq(orgCol, orgId), isNull(deletedCol)) as SQL;
}

/** alive-only filter for global tables (species catalog) or post-scope use. */
export function scopeAlive(deletedCol: PgColumn): SQL {
  return isNull(deletedCol);
}

/** Field set applied on every soft delete. */
export function softDelete(deletedBy?: string): { deletedAt: Date; deletedBy: string | null } {
  return { deletedAt: new Date(), deletedBy: deletedBy ?? null };
}
