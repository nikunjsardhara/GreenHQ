// Auth (PRD section 2): Neon Auth, email + password only, no social login for v1.
//
// Two providers behind one session shape:
//  1. Built-in (default): bcrypt password hashes in `users`, sessions as
//     signed JWTs in the `gs_session` httpOnly cookie. Zero external deps,
//     works offline / in tests.
//  2. Neon Auth passthrough: if NEON_AUTH_JWKS_URL is set, a Bearer/JWT in
//     the `gs_neon_session` cookie is verified against that JWKS (RS256) and
//     matched to a local user by the `email` claim. Local rows remain the
//     source of truth for org membership, roles, and super-admin. Neon only
//     proves identity.
//
// Invite + password-reset links are stateless signed JWTs (no extra tables).
import { compare, hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { getDb } from "@/db";
import { roles, users } from "@/db/schema";
import { scopeAlive } from "./tenant";

export const SESSION_COOKIE = "gs_session";
export const NEON_SESSION_COOKIE = "gs_neon_session";
const SESSION_DAYS = 7;

export interface Session {
  userId: string;
  email: string;
  orgId: string | null;
  isSuperAdmin: boolean;
  via: "local" | "neon";
}

export interface CurrentUser {
  session: Session;
  permissions: string[];
  name: string;
  roleName: string | null;
}

let warnedSecret = false;
function authSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (!warnedSecret) {
      warnedSecret = true;
      console.warn("[auth] AUTH_SECRET unset, using insecure dev default. Set it in .env.");
    }
    return new TextEncoder().encode("dev-only-change-me");
  }
  return new TextEncoder().encode(s);
}

// --- Passwords ---------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  return compare(password, hashValue);
}

// --- Built-in sessions --------------------------------------------------------

export async function signSession(s: Omit<Session, "via">): Promise<string> {
  return new SignJWT({ ...s, via: "local" } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(authSecret());
}

async function verifyLocalSession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.via !== "local" || typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      orgId: (payload.orgId as string | null) ?? null,
      isSuperAdmin: payload.isSuperAdmin === true,
      via: "local",
    };
  } catch {
    return null;
  }
}

// --- Neon Auth passthrough -----------------------------------------------------

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function verifyNeonSession(token: string): Promise<Session | null> {
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) return null;
  try {
    jwks ??= createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, jwks, { algorithms: ["RS256"] });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    if (!email) return null;
    const row = await getDb().query.users.findFirst({
      where: and(eq(users.email, email), scopeAlive(users.deletedAt)),
    });
    if (!row || row.status !== "active") return null;
    return {
      userId: row.id,
      email: row.email,
      orgId: row.orgId,
      isSuperAdmin: row.isSuperAdmin,
      via: "neon",
    };
  } catch {
    return null;
  }
}

export function isNeonAuthEnabled(): boolean {
  return Boolean(process.env.NEON_AUTH_JWKS_URL);
}

// --- Request helpers -------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const neon = jar.get(NEON_SESSION_COOKIE)?.value;
  if (neon) {
    const s = await verifyNeonSession(neon);
    if (s) return s;
  }
  const local = jar.get(SESSION_COOKIE)?.value;
  if (!local) return null;
  const s = await verifyLocalSession(local);
  if (!s) return null;
  // Belt-and-braces: session is only valid while the user row is alive+active.
  const row = await getDb().query.users.findFirst({
    columns: { id: true, status: true },
    where: and(eq(users.id, s.userId), scopeAlive(users.deletedAt)),
  });
  if (!row || row.status !== "active") return null;
  return s;
}

/** Session + resolved permission set (super admin ⇒ ["*"]). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const row = await getDb().query.users.findFirst({
    where: and(eq(users.id, session.userId), scopeAlive(users.deletedAt)),
    with: { role: true },
  });
  if (!row || row.status !== "active") return null;
  return {
    session: { ...session, orgId: row.orgId, isSuperAdmin: row.isSuperAdmin },
    permissions: session.isSuperAdmin || row.isSuperAdmin ? ["*"] : (row.role?.permissions ?? []),
    name: row.name,
    roleName: (row.role as typeof roles.$inferSelect | undefined)?.name ?? null,
  };
}

// --- Login / logout ---------------------------------------------------------------

/**
 * Whether the session cookie needs the Secure flag. Basing this on
 * NODE_ENV alone breaks production builds served over plain HTTP (e.g. a
 * laptop's LAN IP opened on a phone): Chrome silently drops Secure cookies
 * on HTTP, so login "succeeds" but the session never sticks, with no error
 * shown. Instead, follow the actual request protocol: proxies that terminate
 * TLS always send `x-forwarded-proto: https`; a direct connection with no
 * proxy headers is plain HTTP (TLS is always terminated at a proxy here).
 */
async function shouldSecureSessionCookie(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto) return proto === "https";
  } catch {
    // Outside a request scope (scripts/tests): keep the old default.
    return true;
  }
  return false;
}

export async function loginWithPassword(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const row = await getDb().query.users.findFirst({
    where: and(eq(users.email, normalized), scopeAlive(users.deletedAt)),
  });
  if (!row || row.status !== "active") throw new Error("Invalid email or password.");
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) throw new Error("Invalid email or password.");
  const token = await signSession({
    userId: row.id,
    email: row.email,
    orgId: row.orgId,
    isSuperAdmin: row.isSuperAdmin,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldSecureSessionCookie(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return row;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(NEON_SESSION_COOKIE);
}

/** Sets the built-in session cookie for an already-signed token (signup, etc). */
export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldSecureSessionCookie(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

// --- Invite + password-reset links (stateless signed JWTs) --------------------------

export async function signInvite(input: {
  email: string;
  orgId: string;
  roleId: string | null;
}): Promise<string> {
  return new SignJWT({ ...input, kind: "invite" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(authSecret());
}

export async function verifyInvite(token: string): Promise<{
  email: string;
  orgId: string;
  roleId: string | null;
} | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.kind !== "invite" || typeof payload.email !== "string") return null;
    return {
      email: payload.email as string,
      orgId: payload.orgId as string,
      roleId: (payload.roleId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function signPasswordReset(userId: string): Promise<string> {
  return new SignJWT({ userId, kind: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(authSecret());
}

export async function verifyPasswordReset(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.kind !== "reset" || typeof payload.userId !== "string") return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}
