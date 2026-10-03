import { describe, expect, test } from "bun:test";
import {
  STARTER_ROLES,
  hasAllPermissions,
  hasPermission,
  isValidPermission,
} from "../src/lib/permissions";

describe("permissions", () => {
  test("super-admin wildcard grants everything", () => {
    expect(hasPermission(["*"], "sapling.delete")).toBe(true);
    expect(hasAllPermissions(["*"], ["user.manage", "project.delete"])).toBe(true);
  });

  test("field volunteer can capture but not delete", () => {
    const v = STARTER_ROLES.find((r) => r.name === "Field Volunteer")!.permissions;
    expect(hasPermission(v, "sapling.create")).toBe(true);
    expect(hasPermission(v, "sapling.update_status")).toBe(true);
    expect(hasPermission(v, "sapling.delete")).toBe(false);
    expect(hasPermission(v, "user.manage")).toBe(false);
  });

  test("viewer is read-only", () => {
    const v = STARTER_ROLES.find((r) => r.name === "Viewer")!.permissions;
    expect(hasPermission(v, "project.read")).toBe(true);
    expect(hasPermission(v, "gift.create")).toBe(false);
  });

  test("arbitrary status override is gated, not universal", () => {
    const c = STARTER_ROLES.find((r) => r.name === "Coordinator")!.permissions;
    const v = STARTER_ROLES.find((r) => r.name === "Field Volunteer")!.permissions;
    expect(hasPermission(c, "sapling.override_status")).toBe(true);
    expect(hasPermission(v, "sapling.override_status")).toBe(false);
    expect(hasPermission(v, "sapling.update_status")).toBe(true); // guided only
  });

  test("starter roles only use known permissions", () => {
    for (const r of STARTER_ROLES) {
      for (const p of r.permissions) expect(isValidPermission(p)).toBe(true);
    }
  });
});
