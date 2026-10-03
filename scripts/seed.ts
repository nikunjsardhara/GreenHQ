// Seed script, `bun run seed`.
// Idempotent: re-running keeps existing demo data (use --fresh to rebuild).
// Creates: demo org, 4 roles, 4 users, global + org species, a project with a
// zone, 12 saplings with real QR codes, updates, a gift, usage metrics.
import { eq } from "drizzle-orm";
import { getDb, getSql } from "../src/db";
import {
  gifts,
  organizations,
  projects,
  roles,
  saplingUpdates,
  saplings,
  species,
  usageMetrics,
  users,
  zones,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { NATIVE_SPECIES } from "../src/lib/native-species";
import { STARTER_ROLES } from "../src/lib/permissions";
import { giftUrl, newPublicId, qrSvg, saplingUrl } from "../src/lib/qr";

const DEMO_SLUG = "demo-green";
const fresh = process.argv.includes("--fresh");

const db = getDb();
const sql = getSql();

await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

if (fresh) {
  console.log("Wiping demo org data (--fresh)…");
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, DEMO_SLUG),
  });
  if (existing) {
    // Delete leaf-first (hard deletes are seed-only; the app never hard-deletes).
    const projs = await db.query.projects.findMany({
      where: eq(projects.orgId, existing.id),
    });
    for (const p of projs) {
      const saps = await db.query.saplings.findMany({ where: eq(saplings.projectId, p.id) });
      for (const s of saps) {
        await db.delete(saplingUpdates).where(eq(saplingUpdates.saplingId, s.id));
        await db.delete(gifts).where(eq(gifts.saplingId, s.id));
        await db.delete(saplings).where(eq(saplings.id, s.id));
      }
      await db.delete(zones).where(eq(zones.projectId, p.id));
      await db.delete(projects).where(eq(projects.id, p.id));
    }
    await db.delete(species).where(eq(species.orgId, existing.id));
    await db.delete(users).where(eq(users.orgId, existing.id));
    await db.delete(roles).where(eq(roles.orgId, existing.id));
    await db.delete(usageMetrics).where(eq(usageMetrics.orgId, existing.id));
    await db.delete(organizations).where(eq(organizations.id, existing.id));
  }
}

let org = await db.query.organizations.findFirst({ where: eq(organizations.slug, DEMO_SLUG) });
if (!org) {
  const [row] = await db
    .insert(organizations)
    .values({
      name: "Demo Green Org",
      slug: DEMO_SLUG,
      brandColor: "#2e7d32",
      contactEmail: "hello@demo-green.example",
      address: "Indore, Madhya Pradesh",
    })
    .returning();
  org = row;
  console.log(`org: ${org.name}`);
} else {
  console.log(`org exists: ${org.name} (skipping user/species/project creation)`);
}

if (org) {
  const orgId = org.id;
  const existingUsers = await db.query.users.findMany({ where: eq(users.orgId, orgId) });

  if (existingUsers.length === 0) {
    // Roles: Org Admin (all permissions) + PRD starter roles.
    const { PERMISSIONS } = await import("../src/lib/permissions");
    const roleRows: Record<string, string> = {};
    for (const r of [{ name: "Org Admin", permissions: [...PERMISSIONS] }, ...STARTER_ROLES]) {
      const [row] = await db
        .insert(roles)
        .values({ orgId, name: r.name, permissions: [...r.permissions], isDefault: true })
        .returning();
      roleRows[r.name] = row.id;
    }

    const pw = await hashPassword("password123");
    // Platform super admin (no org).
    const superExists = await db.query.users.findFirst({ where: eq(users.email, "superadmin@GreenHQ.local") });
    if (!superExists) {
      await db.insert(users).values({
        orgId: null,
        email: "superadmin@GreenHQ.local",
        passwordHash: pw,
        name: "Super Admin",
        status: "active",
        isSuperAdmin: true,
      });
    }
    const mk = async (email: string, name: string, role: string) => {
      const dupe = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (dupe) {
        console.log(`user exists: ${email} (${role})`);
        return;
      }
      await db.insert(users).values({
        orgId,
        email,
        passwordHash: pw,
        name,
        status: "active",
        roleId: roleRows[role],
      });
    };
    await mk("admin@demo-green.example", "Asha Admin", "Org Admin");
    await mk("coordinator@demo-green.example", "Kabir Coordinator", "Coordinator");
    await mk("volunteer@demo-green.example", "Meera Volunteer", "Field Volunteer");
    await mk("viewer@demo-green.example", "Dev Viewer", "Viewer");
    console.log("users: superadmin + admin/coordinator/volunteer/viewer (password: password123)");

    // Global species catalog (org_id NULL) + one org-specific entry.
    // Full Indian native tree list lives in src/lib/native-species.ts so
    // seed and backfills stay in sync.
    const speciesIds: string[] = [];
    for (const s of NATIVE_SPECIES) {
      const [row] = await db
        .insert(species)
        .values({ orgId: null, commonName: s.commonName, scientificName: s.scientificName, category: s.category, co2KgPerYear: s.co2KgPerYear })
        .returning();
      speciesIds.push(row.id);
    }
    await db.insert(species).values({
      orgId,
      commonName: "Demo Farm Teak",
      scientificName: "Tectona grandis",
      category: "timber",
      co2KgPerYear: 14.1,
    });
    console.log(`species: ${NATIVE_SPECIES.length} global + 1 org-specific`);

    const volunteer = await db.query.users.findFirst({ where: eq(users.email, "volunteer@demo-green.example") });

    // Project + zone.
    const zonePoly = {
      type: "Polygon",
      coordinates: [
        [
          [75.85, 22.71],
          [75.87, 22.71],
          [75.87, 22.73],
          [75.85, 22.73],
          [75.85, 22.71],
        ],
      ],
    };
    const [project] = await db
      .insert(projects)
      .values({
        orgId,
        name: "City Park Drive 2026",
        description: "Monsoon plantation across the north block with school volunteers.",
        status: "active",
        targetCount: 500,
        zoneGeojson: zonePoly,
      })
      .returning();
    await db.insert(zones).values({ orgId, projectId: project.id, name: "North block", polygonGeojson: zonePoly });

    // 12 saplings: 4 registered (QR printed, awaiting field activation),
    // 5 planted, 3 growing, with real QR SVG payloads.
    const statuses = ["registered", "registered", "registered", "registered", "planted", "planted", "planted", "planted", "planted", "growing", "growing", "growing"] as const;
    const saplingIds: string[] = [];
    for (let i = 0; i < statuses.length; i++) {
      const code = newPublicId();
      const inGround = statuses[i] !== "registered";
      const [s] = await db
        .insert(saplings)
        .values({
          orgId,
          projectId: project.id,
          speciesId: speciesIds[i % speciesIds.length],
          nanoid: code,
          qrSvg: await qrSvg(saplingUrl(code)),
          lat: inGround ? 22.71 + Math.random() * 0.02 : null,
          lng: inGround ? 75.85 + Math.random() * 0.02 : null,
          gpsAccuracyM: inGround ? 4 + Math.random() * 8 : null,
          status: statuses[i],
          plantedAt: inGround ? new Date(Date.now() - i * 86400000) : null,
          plantedBy: inGround ? (volunteer?.id ?? null) : null,
        })
        .returning();
      saplingIds.push(s.id);
      if (inGround) {
        await db.insert(saplingUpdates).values({
          orgId,
          saplingId: s.id,
          status: statuses[i],
          note: i % 3 === 0 ? "Watered and mulched." : null,
          recordedBy: volunteer?.id ?? null,
          recordedAt: new Date(Date.now() - i * 86400000),
        });
      }
    }
    console.log(`saplings: ${saplingIds.length} with QR codes`);

    // A gift on the first growing sapling.
    const token = newPublicId() + "X";
    await db.insert(gifts).values({
      orgId,
      saplingId: saplingIds[9],
      recipientName: "Riya Sharma",
      recipientContact: "riya@example.com",
      message: "For your new home, may it grow with you!",
      shareToken: token,
    });
    console.log(`gift: /g/${token} → ${giftUrl(token)}`);

    await db.insert(usageMetrics).values({
      orgId,
      metricType: "saplings.created",
      value: saplingIds.length,
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(),
    });
  }
}

console.log("\nSeed complete. Sign in with:");
console.log("  superadmin@GreenHQ.local / password123  (super admin)");
console.log("  admin@demo-green.example / password123      (org admin)");

// Demo role users for "Grow Native Green Forum". Idempotent: safe to re-run
// against any DB (local or Neon). Creates the org shell if it does not exist
// yet, tops up any missing starter roles, and creates any missing role users.
const GNGF_NAME = "Grow Native Green Forum";
const GNGF_SLUG = "grow-native-green-forum";
const GNGF_USERS = [
  { email: "admin@grow-native-green.example", name: "Tara Admin", role: "Org Admin" },
  { email: "coordinator@grow-native-green.example", name: "Arjun Coordinator", role: "Coordinator" },
  { email: "volunteer@grow-native-green.example", name: "Riya Volunteer", role: "Field Volunteer" },
  { email: "viewer@grow-native-green.example", name: "Sara Viewer", role: "Viewer" },
];

let gngf = await db.query.organizations.findFirst({ where: eq(organizations.name, GNGF_NAME) });
if (!gngf) {
  const slugTaken = await db.query.organizations.findFirst({ where: eq(organizations.slug, GNGF_SLUG) });
  if (slugTaken) {
    console.log(`GNGF setup skipped: slug "${GNGF_SLUG}" belongs to a different org.`);
  } else {
    const [row] = await db
      .insert(organizations)
      .values({
        name: GNGF_NAME,
        slug: GNGF_SLUG,
        brandColor: "#2e7d32",
        contactEmail: "hello@grow-native-green.example",
        address: "Indore, Madhya Pradesh",
      })
      .returning();
    gngf = row;
    console.log(`org: ${gngf.name}`);
  }
}
if (gngf) {
  const { PERMISSIONS } = await import("../src/lib/permissions");
  const wantedRoles = [{ name: "Org Admin", permissions: [...PERMISSIONS] }, ...STARTER_ROLES];
  const existingRoles = await db.query.roles.findMany({ where: eq(roles.orgId, gngf.id) });
  const roleIdByName: Record<string, string> = Object.fromEntries(existingRoles.map((r) => [r.name, r.id]));
  for (const r of wantedRoles) {
    if (!roleIdByName[r.name]) {
      const [row] = await db
        .insert(roles)
        .values({ orgId: gngf.id, name: r.name, permissions: [...r.permissions], isDefault: true })
        .returning();
      roleIdByName[r.name] = row.id;
    }
  }
  const gngfPw = await hashPassword("password123");
  for (const u of GNGF_USERS) {
    const found = await db.query.users.findFirst({ where: eq(users.email, u.email) });
    if (found) {
      console.log(`user exists: ${u.email} (${u.role})`);
      continue;
    }
    await db.insert(users).values({
      orgId: gngf.id,
      email: u.email,
      passwordHash: gngfPw,
      name: u.name,
      status: "active",
      roleId: roleIdByName[u.role] ?? null,
    });
    console.log(`user created: ${u.email} (${u.role}, password: password123)`);
  }
}
process.exit(0);
