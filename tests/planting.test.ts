import { describe, expect, test } from "bun:test";
import { parsePlantedAt, resolvePlantedAt } from "../src/lib/planting";

const NOW = new Date("2026-09-12T10:00:00.000Z");

describe("planting", () => {
  test("explicit date wins over everything", () => {
    const d = resolvePlantedAt({
      target: "planted",
      currentPlantedAt: null,
      explicitRaw: "2026-05-12T00:00:00.000Z",
      now: NOW,
    });
    expect(d?.toISOString()).toBe("2026-05-12T00:00:00.000Z");
  });

  test("explicit date overwrites an existing planted date (replant correction)", () => {
    const d = resolvePlantedAt({
      target: "planted",
      currentPlantedAt: new Date("2026-01-01T00:00:00.000Z"),
      explicitRaw: "2026-06-01T00:00:00.000Z",
      now: NOW,
    });
    expect(d?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  test("moving to planted with no date stamps the date of change", () => {
    const d = resolvePlantedAt({ target: "planted", currentPlantedAt: null, now: NOW });
    expect(d?.toISOString()).toBe(NOW.toISOString());
  });

  test("existing planted date is never rewritten without an explicit date", () => {
    const existing = new Date("2026-01-01T00:00:00.000Z");
    expect(resolvePlantedAt({ target: "planted", currentPlantedAt: existing, now: NOW })).toBeUndefined();
    expect(resolvePlantedAt({ target: "growing", currentPlantedAt: existing, now: NOW })).toBeUndefined();
  });

  test("non-planted moves leave the date untouched", () => {
    expect(resolvePlantedAt({ target: "growing", currentPlantedAt: null, now: NOW })).toBeUndefined();
    expect(resolvePlantedAt({ target: "lost", currentPlantedAt: null, now: NOW })).toBeUndefined();
  });

  test("invalid and future dates throw", () => {
    expect(() => parsePlantedAt("not-a-date", NOW)).toThrow("not a valid date");
    expect(() => parsePlantedAt("2026-09-13T00:00:00.000Z", NOW)).toThrow("in the future");
    expect(() =>
      resolvePlantedAt({ target: "planted", currentPlantedAt: null, explicitRaw: "bogus", now: NOW }),
    ).toThrow();
  });
});
