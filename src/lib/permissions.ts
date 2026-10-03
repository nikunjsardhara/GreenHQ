// Granular permission model, PRD §4.
// Org admins compose these permissions into named roles; role names are
// org-defined, permissions are platform-defined. `*` = super-admin bypass.
export const PERMISSIONS = [
  "org.manage", // suspend/brand/org profile (org admin + super admin)
  "user.manage", // invite / remove / reset-password
  "role.manage", // create/edit custom roles
  "project.create",
  "project.read",
  "project.update",
  "project.delete",
  "sapling.create",
  "sapling.bulk_create",
  "sapling.read",
  "sapling.update_status", // guided lifecycle moves (next stage, lost, replaced)
  "sapling.override_status", // arbitrary jumps to any status (coordinators+)
  "sapling.delete",
  "species.manage",
  "species.read",
  "gift.create",
  "gift.manage",
  "report.export",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export interface StarterRole {
  name: string;
  permissions: Permission[];
}

/** Suggested defaults shipped per org (editable), PRD §4. */
export const STARTER_ROLES: StarterRole[] = [
  {
    name: "Coordinator",
    permissions: ALL.filter((p) => !["org.manage", "user.manage", "role.manage"].includes(p)),
  },
  {
    name: "Field Volunteer",
    permissions: [
      "project.read",
      "sapling.create",
      "sapling.read",
      "sapling.update_status",
      "species.read",
      "gift.create",
    ],
  },
  {
    name: "Viewer",
    permissions: ["project.read", "sapling.read", "species.read"],
  },
];

/** Super-admin wildcard counts as every permission. */
export function hasPermission(granted: string[], required: Permission): boolean {
  return granted.includes("*") || granted.includes(required);
}

export function hasAllPermissions(granted: string[], required: Permission[]): boolean {
  return required.every((p) => hasPermission(granted, p));
}

export function isValidPermission(p: string): p is Permission {
  return (PERMISSIONS as readonly string[]).includes(p);
}
