import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { organizations, roles, users } from "@/db/schema";
import { hashPassword, setSessionCookie, signSession } from "@/lib/auth";
import { api, badRequest, clientKey } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { scopeAlive } from "@/lib/tenant";
import { PERMISSIONS, STARTER_ROLES } from "@/lib/permissions";
import { and, eq } from "drizzle-orm";

// POST /api/auth/signup, public self-serve organization signup.
// Creates the org + starter roles + first user (Org Admin, active) and signs
// them in immediately, so a new NGO can start its first project with no wait.
const SignupBody = z.object({
  orgName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

function slugifyOrgName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return base.length >= 2 ? base : "org";
}

export const POST = api(async (req: NextRequest) => {
  const rl = checkRateLimit(`signup:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts, try again later." }, { status: 429 });
  const parsed = SignupBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("Organization name, your name, a valid email and an 8+ character password are required.");
  const db = getDb();
  const email = parsed.data.email.toLowerCase();

  const emailDupe = await db.query.users.findFirst({
    where: and(eq(users.email, email), scopeAlive(users.deletedAt)),
  });
  if (emailDupe)
    return NextResponse.json({ error: "That email is already registered. Try signing in instead." }, { status: 409 });

  const base = slugifyOrgName(parsed.data.orgName);
  let slug = base;
  for (let i = 2; ; i++) {
    const slugDupe = await db.query.organizations.findFirst({
      where: and(eq(organizations.slug, slug), scopeAlive(organizations.deletedAt)),
    });
    if (!slugDupe) break;
    slug = `${base}-${i}`;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: parsed.data.orgName.trim(), slug, contactEmail: email })
      .returning();
    let adminRoleId: string | null = null;
    for (const r of [{ name: "Org Admin", permissions: [...PERMISSIONS] }, ...STARTER_ROLES]) {
      const [role] = await tx
        .insert(roles)
        .values({ orgId: org.id, name: r.name, permissions: [...r.permissions], isDefault: true })
        .returning();
      if (r.name === "Org Admin") adminRoleId = role.id;
    }
    const [user] = await tx
      .insert(users)
      .values({
        orgId: org.id,
        email,
        passwordHash,
        name: parsed.data.name.trim(),
        status: "active",
        roleId: adminRoleId,
      })
      .returning();
    return { org, user };
  });

  await logAudit({
    orgId: result.org.id,
    userId: result.user.id,
    action: "org.create",
    entityType: "organization",
    entityId: result.org.id,
    after: { name: result.org.name, slug, signup: true },
  });
  await setSessionCookie(
    await signSession({
      userId: result.user.id,
      email: result.user.email,
      orgId: result.org.id,
      isSuperAdmin: false,
    }),
  );
  return NextResponse.json(
    { ok: true, organization: { id: result.org.id, name: result.org.name, slug: result.org.slug } },
    { status: 201 },
  );
});
