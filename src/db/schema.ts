// GreenHQ data model, PRD §7.
// Principles baked in (PRD §3):
//  - every tenant-owned table carries organization_id (query-layer isolation)
//  - soft delete everywhere (deleted_at / deleted_by, no hard deletes)
//  - metadata JSONB on every core entity for schema-without-migration extensibility
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Enums -----------------------------------------------------------------

export const orgStatusEnum = pgEnum("org_status", ["active", "suspended"]);
export const userStatusEnum = pgEnum("user_status", ["active", "invited", "suspended"]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "completed",
  "archived",
]);
// PRD §5.3 lifecycle: Registered → Planted → Growing → Mature → Lost/Dead → Replaced
export const saplingStatusEnum = pgEnum("sapling_status", [
  "registered",
  "planted",
  "growing",
  "mature",
  "lost",
  "replaced",
]);

export type SaplingStatus = (typeof saplingStatusEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];

// --- Organizations (PRD §5.1) -----------------------------------------------

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    brandColor: text("brand_color").default("#2e7d32"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    address: text("address"),
    status: orgStatusEnum("status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organizations_slug_uidx").on(t.slug)],
);

// --- Users & roles (PRD §4) ---------------------------------------------------

export const roles = pgTable(
  "roles",
  {
    // org_id NULL = system template (e.g. the editable starter roles)
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    name: text("name").notNull(),
    permissions: text("permissions").array().notNull().default([]),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("roles_org_idx").on(t.orgId)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // NULL org = platform super admin (PRD §4 scope: entire platform)
    orgId: uuid("org_id").references(() => organizations.id),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    status: userStatusEnum("status").notNull().default("invited"),
    roleId: uuid("role_id").references(() => roles.id),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_uidx").on(t.email),
    index("users_org_idx").on(t.orgId),
  ],
);

// --- Projects (PRD §5.2) -------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    description: text("description"),
    // Long-form field notes (soil, water, owner contacts, visit log…).
    // Shown on the project page by default; editable in place.
    notes: text("notes"),
    coverImage: text("cover_image"),
    // Primary display zone; named sub-zones live in `zones`.
    zoneGeojson: jsonb("zone_geojson").$type<Record<string, unknown>>(),
    status: projectStatusEnum("status").notNull().default("planning"),
    targetCount: integer("target_count").notNull().default(0),
    startDate: date("start_date"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_org_idx").on(t.orgId, t.status)],
);

// --- Species catalog (PRD §5.7: org_id NULL = shared global catalog) ----------

export const species = pgTable(
  "species",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    commonName: text("common_name").notNull(),
    scientificName: text("scientific_name"),
    category: text("category").notNull().default("native"),
    co2KgPerYear: real("co2_kg_per_year").notNull().default(0),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("species_org_idx").on(t.orgId)],
);

// --- Saplings (PRD §5.3: one row, one QR, one public page) --------------------

export const saplings = pgTable(
  "saplings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Denormalized tenant id so every query can scope by org without a join.
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    speciesId: uuid("species_id").references(() => species.id),
    // Short URL-safe identifier used in the QR payload /t/<nanoid>.
    nanoid: text("nanoid").notNull(),
    qrSvg: text("qr_svg").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    gpsAccuracyM: real("gps_accuracy_m"),
    status: saplingStatusEnum("status").notNull().default("registered"),
    plantedAt: timestamp("planted_at", { withTimezone: true }),
    plantedBy: uuid("planted_by").references(() => users.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saplings_nanoid_uidx").on(t.nanoid),
    index("saplings_org_project_idx").on(t.orgId, t.projectId, t.status),
  ],
);

// --- Sapling updates / growth timeline (PRD §6.3) ------------------------------

export const saplingUpdates = pgTable(
  "sapling_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    saplingId: uuid("sapling_id")
      .notNull()
      .references(() => saplings.id),
    status: saplingStatusEnum("status").notNull(),
    photoUrl: text("photo_url"),
    note: text("note"),
    recordedBy: uuid("recorded_by").references(() => users.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sapling_updates_sapling_idx").on(t.saplingId, t.recordedAt)],
);

// --- Gifts (PRD §5.6) -----------------------------------------------------------

export const gifts = pgTable(
  "gifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    // One active gift per sapling.
    saplingId: uuid("sapling_id")
      .notNull()
      .references(() => saplings.id),
    giftedByUserId: uuid("gifted_by_user_id").references(() => users.id),
    recipientName: text("recipient_name").notNull(),
    recipientContact: text("recipient_contact"),
    message: text("message"),
    shareToken: text("share_token").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimedByContact: text("claimed_by_contact"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gifts_share_token_uidx").on(t.shareToken),
    uniqueIndex("gifts_sapling_uidx").on(t.saplingId),
    index("gifts_org_idx").on(t.orgId),
  ],
);

// --- Zones (PRD §5.2 / §7: named polygons inside a project) ---------------------

export const zones = pgTable(
  "zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    polygonGeojson: jsonb("polygon_geojson").$type<Record<string, unknown>>().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("zones_project_idx").on(t.projectId)],
);

// --- Notifications (PRD §6.8) -----------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

// --- Audit log (PRD §6.10: who changed what, when, before/after) -----------------

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_org_entity_idx").on(t.orgId, t.entityType, t.entityId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

// --- Usage metering (PRD §6.15: tracked now so billing can layer on later) --------

export const usageMetrics = pgTable(
  "usage_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    metricType: text("metric_type").notNull(),
    value: integer("value").notNull().default(0),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_metrics_org_idx").on(t.orgId, t.metricType, t.periodStart)],
);

// --- Relations (relational query API) -------------------------------------------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  roles: many(roles),
  projects: many(projects),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  org: one(organizations, { fields: [roles.orgId], references: [organizations.id] }),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  org: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  org: one(organizations, { fields: [projects.orgId], references: [organizations.id] }),
  saplings: many(saplings),
  zones: many(zones),
}));

export const speciesRelations = relations(species, ({ one }) => ({
  org: one(organizations, { fields: [species.orgId], references: [organizations.id] }),
}));

export const saplingsRelations = relations(saplings, ({ one, many }) => ({
  org: one(organizations, { fields: [saplings.orgId], references: [organizations.id] }),
  project: one(projects, { fields: [saplings.projectId], references: [projects.id] }),
  species: one(species, { fields: [saplings.speciesId], references: [species.id] }),
  updates: many(saplingUpdates),
  gift: one(gifts, { fields: [saplings.id], references: [gifts.saplingId] }),
}));

export const saplingUpdatesRelations = relations(saplingUpdates, ({ one }) => ({
  sapling: one(saplings, { fields: [saplingUpdates.saplingId], references: [saplings.id] }),
}));

export const giftsRelations = relations(gifts, ({ one }) => ({
  sapling: one(saplings, { fields: [gifts.saplingId], references: [saplings.id] }),
  org: one(organizations, { fields: [gifts.orgId], references: [organizations.id] }),
}));

export const zonesRelations = relations(zones, ({ one }) => ({
  project: one(projects, { fields: [zones.projectId], references: [projects.id] }),
}));
