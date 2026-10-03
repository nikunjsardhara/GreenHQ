import { beforeEach, describe, expect, test } from "bun:test";
import { checkRateLimit, resetRateLimits } from "../src/lib/rate-limit";

describe("rate limit", () => {
  beforeEach(resetRateLimits);

  test("allows up to the limit then blocks", () => {
    for (let i = 0; i < 5; i++) expect(checkRateLimit("k", 5).ok).toBe(true);
    const blocked = checkRateLimit("k", 5);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  test("window expiry resets the bucket", () => {
    expect(checkRateLimit("k", 1, 1000, 0).ok).toBe(true);
    expect(checkRateLimit("k", 1, 1000, 500).ok).toBe(false);
    expect(checkRateLimit("k", 1, 1000, 1001).ok).toBe(true);
  });
});
