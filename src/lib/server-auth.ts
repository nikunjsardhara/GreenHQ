// Server-side authz gate for API routes + server components.
import { getCurrentUser, type CurrentUser } from "./auth";
import { badRequest, forbidden, unauthorized } from "./http";
import { hasPermission, type Permission } from "./permissions";

export async function requireUser(...perms: Permission[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw unauthorized();
  for (const p of perms) {
    if (!hasPermission(u.permissions, p)) throw forbidden(`Missing permission: ${p}`);
  }
  return u;
}

/**
 * Resolve the tenant scope for a request.
 * - Org users are pinned to their own org (explicit orgId must match).
 * - Super admins must pass an explicit orgId (or org slug) to act within an org.
 */
export function orgScope(
  u: CurrentUser,
  opts: { orgId?: string | null; allowGlobal?: boolean } = {},
): string {
  if (u.session.isSuperAdmin) {
    if (opts.orgId) return opts.orgId;
    if (opts.allowGlobal) return "__global__";
    throw badRequest("orgId is required for platform-level access.");
  }
  const own = u.session.orgId;
  if (!own) throw forbidden("No organization membership.");
  if (opts.orgId && opts.orgId !== own) throw forbidden("Cross-organization access denied.");
  return own;
}
