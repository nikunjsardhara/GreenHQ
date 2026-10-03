import { describe, expect, test } from "bun:test";
import { geojsonAreaHa, pointInRing, polygonAreaHa, zoneContainingPoint } from "../src/lib/geo";

describe("geo", () => {
  test("~1 ha for a 100x100 m square", () => {
    // 100 m ≈ 0.0008983 degrees latitude; adjust lng by cos(lat).
    const lat = 22.72;
    const d = 100 / 111320;
    const dx = d / Math.cos((lat * Math.PI) / 180);
    const ring: [number, number][] = [
      [75.86, lat],
      [75.86 + dx, lat],
      [75.86 + dx, lat + d],
      [75.86, lat + d],
      [75.86, lat],
    ];
    expect(polygonAreaHa(ring)).toBeGreaterThan(0.99);
    expect(polygonAreaHa(ring)).toBeLessThan(1.01);
    expect(geojsonAreaHa({ coordinates: [ring] })).toBeCloseTo(polygonAreaHa(ring), 6);
  });

  test("returns 0 for invalid input", () => {
    expect(polygonAreaHa(null)).toBe(0);
    expect(polygonAreaHa([[0, 0]])).toBe(0);
    expect(geojsonAreaHa(null)).toBe(0);
  });

  test("point-in-ring detects inside/outside", () => {
    const ring: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    expect(pointInRing(0.5, 0.5, ring)).toBe(true);
    expect(pointInRing(2, 2, ring)).toBe(false);
    expect(pointInRing(-0.1, 0.5, ring)).toBe(false);
  });

  test("zoneContainingPoint names the enclosing zone", () => {
    const zones = [
      { name: "North", polygonGeojson: { coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } },
      { name: "South", polygonGeojson: { coordinates: [[[0, 2], [1, 2], [1, 3], [0, 3], [0, 2]]] } },
    ];
    expect(zoneContainingPoint(0.5, 0.5, zones)).toBe("North");
    expect(zoneContainingPoint(2.5, 0.5, zones)).toBe("South");
    expect(zoneContainingPoint(9, 9, zones)).toBeNull();
    expect(zoneContainingPoint(null, 0.5, zones)).toBeNull();
    expect(zoneContainingPoint(0.5, 0.5, [])).toBeNull();
  });
});
