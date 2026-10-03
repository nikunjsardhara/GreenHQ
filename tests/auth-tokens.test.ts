// Auth crypto round-trips: password hashing plus the stateless
// invite / password-reset JWTs. No cookies or DB needed.
import { describe, expect, test } from "bun:test";
import {
  hashPassword,
  signInvite,
  signPasswordReset,
  verifyInvite,
  verifyPassword,
  verifyPasswordReset,
} from "../src/lib/auth";

process.env.AUTH_SECRET ??= "test-secret-for-unit-tests-only";

describe("passwords", () => {
  test("correct password verifies, wrong one does not", async () => {
    const hash = await hashPassword("correct-horse-123");
    expect(hash).not.toContain("correct-horse-123");
    expect(await verifyPassword("correct-horse-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  test("same password hashes differently each time (salted)", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
});

describe("invite tokens", () => {
  const claim = { email: "new@org.example", orgId: "org-1", roleId: "role-1" };

  test("round-trips the invite claim", async () => {
    expect(await verifyInvite(await signInvite(claim))).toEqual(claim);
  });

  test("nullable roleId survives", async () => {
    const out = await verifyInvite(await signInvite({ ...claim, roleId: null }));
    expect(out?.roleId).toBeNull();
  });

  test("tampered tokens are rejected", async () => {
    const token = await signInvite(claim);
    const [h, , s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...claim, orgId: "evil-org" })).toString("base64url");
    expect(await verifyInvite(`${h}.${forgedPayload}.${s}`)).toBeNull();
    expect(await verifyInvite("not-a-token")).toBeNull();
    expect(await verifyInvite("")).toBeNull();
  });

  test("a password-reset token is not a valid invite (kind confusion)", async () => {
    const reset = await signPasswordReset("user-1");
    expect(await verifyInvite(reset)).toBeNull();
  });
});

describe("password-reset tokens", () => {
  test("round-trips the user id", async () => {
    expect(await verifyPasswordReset(await signPasswordReset("user-9"))).toBe("user-9");
  });

  test("an invite token is not a valid reset (kind confusion)", async () => {
    const invite = await signInvite({ email: "a@b.c", orgId: "o", roleId: null });
    expect(await verifyPasswordReset(invite)).toBeNull();
  });

  test("garbage is rejected", async () => {
    expect(await verifyPasswordReset("garbage")).toBeNull();
  });
});
