import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { organizations, roles, users } from "@/db/schema";
import { signInvite } from "@/lib/auth";
import { api, badRequest } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { appUrl } from "@/lib/qr";
import { orgScope, requireUser } from "@/lib/server-auth";
import { STARTER_ROLES } from "@/lib/permissions";
import { scopeAlive } from "@/lib/tenant";
import { and, desc, eq } from "drizzle-orm";

// GET /api/organizations, super admin: all orgs; org user: own org.
export const GET = api(async () => {
  const me = await requireUser();
  const db = getDb();
  if (me.session.isSuperAdmin) {
    const rows = await db.query.organizations.findMany({
      where: scopeAlive(organizations.deletedAt),
      orderBy: desc(organizations.createdAt),
    });
    return NextResponse.json({ organizations: rows });
  }
  const orgId = orgScope(me, {});
  const row = await db.query.organizations.findFirst({
    where: and(eq(organizations.id, orgId), scopeAlive(organizations.deletedAt)),
  });
  return NextResponse.json({ organizations: row ? [row] : [] });
});

// POST /api/organizations, super admin creates org shell + roles + first
// admin invite (PRD §5.1 onboarding: otherwise no org can ever be created).
const CreateBody = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(120),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  contactEmail: z.string().email().optional(),
});

export const POST = api(async (req: NextRequest) => {
  const me = await requireUser();
  if (!me.session.isSuperAdmin)
    return NextResponse.json({ error: "Only super admins can create organizations." }, { status: 403 });
  const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw badRequest("name, slug, adminEmail and adminName are required.");
  const db = getDb();
  const dupe = await db.query.organizations.findFirst({
    where: and(eq(organizations.slug, parsed.data.slug), scopeAlive(organizations.deletedAt)),
  });
  if (dupe) return NextResponse.json({ error: "Slug already taken." }, { status: 409 });

  const { name, slug, adminEmail, adminName } = parsed.data;
  const email = adminEmail.trim().toLowerCase();
  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name,
        slug,
        brandColor: parsed.data.brandColor ?? "#2e7d32",
        contactEmail: parsed.data.contactEmail ?? email,
      })
      .returning();
    const { PERMISSIONS } = await import("@/lib/permissions");
    let adminRoleId: string | null = null;
    for (const r of [{ name: "Org Admin", permissions: [...PERMISSIONS] }, ...STARTER_ROLES]) {
      const [role] = await tx
        .insert(roles)
        .values({ orgId: org.id, name: r.name, permissions: [...r.permissions], isDefault: true })
        .returning();
      if (r.name === "Org Admin") adminRoleId = role.id;
    }
    const [admin] = await tx
      .insert(users)
      .values({
        orgId: org.id,
        email,
        passwordHash: `invited:${Date.now()}`,
        name: adminName,
        status: "invited",
        roleId: adminRoleId,
      })
      .returning();
    return { org, admin };
  });

  const token = await signInvite({ email, orgId: result.org.id, roleId: result.admin.roleId });
  const link = `${appUrl()}/invite/${token}`;
  await logAudit({
    orgId: result.org.id,
    userId: me.session.userId,
    action: "org.create",
    entityType: "organization",
    entityId: result.org.id,
    after: { name, slug },
  });
  await notify({
    orgId: result.org.id,
    userId: result.admin.id,
    type: "invite.received",
    payload: { email, orgName: name },
    email: {
      to: email,
      subject: `Set up your ${name} admin account`,
      html: `<p>Hi ${adminName},</p><p>${name} is ready on GreenHQ. <a href="${link}">Set your password to get started</a>.</p>`,
    },
  });
  return NextResponse.json({ organization: result.org, inviteLink: link }, { status: 201 });
});
