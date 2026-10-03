// Create users during development, `bun run users:create -- --email …`.
// Examples:
//   bun run users:create -- --email admin@myngo.org --password secret123 --name "Asha" --org demo-green --role "Org Admin"
//   bun run users:create -- --email riya@green.example --password secret123 --name "Riya Volunteer" --org "Grow Native Green Forum" --role "Field Volunteer"
//   bun run users:create -- --email root@local --password secret123 --name Root --superadmin
// Note: --org accepts an org slug or the exact org name.
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { organizations, roles, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

const email = arg("email")?.trim().toLowerCase();
const password = arg("password") ?? "";
const name = arg("name") ?? email ?? "Unnamed";
const orgSlug = arg("org");
const roleName = arg("role");
const superadmin = process.argv.includes("--superadmin");

if (!email || password.length < 8) {
  console.error("Usage: bun run users:create -- --email <email> --password <8+ chars> --name <name> [--org <slug>] [--role <name>] [--superadmin]");
  process.exit(1);
}

const db = getDb();
const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
if (existing) {
  console.error(`User ${email} already exists.`);
  process.exit(1);
}

let orgId: string | null = null;
let roleId: string | null = null;
if (!superadmin) {
  if (!orgSlug) {
    console.error("Non-superadmin users need --org <slug or exact name>.");
    process.exit(1);
  }
  const org =
    (await db.query.organizations.findFirst({ where: eq(organizations.slug, orgSlug) })) ??
    (await db.query.organizations.findFirst({ where: eq(organizations.name, orgSlug) }));
  if (!org) {
    console.error(`Org "${orgSlug}" not found (tried slug, then exact name).`);
    process.exit(1);
  }
  orgId = org.id;
  if (roleName) {
    const role = await db.query.roles.findFirst({
      where: eq(roles.name, roleName),
    });
    if (!role || (role.orgId !== null && role.orgId !== orgId)) {
      console.error(`Role "${roleName}" not found for this org.`);
      process.exit(1);
    }
    roleId = role.id;
  }
}

const [row] = await db
  .insert(users)
  .values({
    orgId,
    email,
    passwordHash: await hashPassword(password),
    name,
    status: "active",
    roleId,
    isSuperAdmin: superadmin,
  })
  .returning();

console.log(`Created ${superadmin ? "super admin" : "user"}: ${row.email} (${row.id})`);
process.exit(0);
