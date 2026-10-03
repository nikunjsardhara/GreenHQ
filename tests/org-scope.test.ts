// Tenant-scope gate: who may act inside which organization.
// Pure function, no cookies or DB needed.
import { describe, expect, test } from "bun:test";
import type { CurrentUser } from "../src/lib/auth";
import { orgScope } from "../src/lib/server-auth";

function user(overrides: Partial<CurrentUser["session"]> = {}): CurrentUser {
  return {
    session: { userId: "u", email: "u@x.y", orgId: "org-a", isSuperAdmin: false, via: "local", ...overrides },
    permissions: [],
    name: "U",
    roleName: null,
  };
}

describe("orgScope", () => {
  test("org users are pinned to their own org", () => {
    expect(orgScope(user(), {})).toBe("org-a");
  });

  test("org users cannot reach across orgs", () => {
    expect(() => orgScope(user(), { orgId: "org-b" })).toThrow(/Cross-organization/);
  });

  test("org users may pass their own org explicitly", () => {
    expect(orgScope(user(), { orgId: "org-a" })).toBe("org-a");
  });

  test("users without membership are denied", () => {
    expect(() => orgScope(user({ orgId: null }), {})).toThrow(/membership/);
  });

  test("super admins must name an org explicitly", () => {
    const su = user({ orgId: null, isSuperAdmin: true });
    expect(() => orgScope(su, {})).toThrow(/orgId is required/);
    expect(orgScope(su, { orgId: "org-b" })).toBe("org-b");
  });

  test("super admins can opt into the global scope", () => {
    const su = user({ orgId: null, isSuperAdmin: true });
    expect(orgScope(su, { allowGlobal: true })).toBe("__global__");
  });
});
