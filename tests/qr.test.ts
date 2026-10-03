import { describe, expect, test } from "bun:test";
import { nanoidAlphabet, newPublicId, saplingUrl, scatterInPolygon } from "../src/lib/qr";

describe("public ids", () => {
  test("uses unambiguous alphabet (no 0/O/1/I/l)", () => {
    expect(nanoidAlphabet).not.toMatch(/[01OIl]/);
  });

  test("ids are unique and url-safe", () => {
    const ids = new Set(Array.from({ length: 1000 }, newPublicId));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z2-9]+$/);
  });

  test("sapling url embeds the nanoid", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.org";
    expect(saplingUrl("abc123")).toBe("https://example.org/t/abc123");
    delete process.env.NEXT_PUBLIC_APP_URL;
  });
});

describe("scatterInPolygon", () => {
  const square = {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ] as [number, number][],
    ],
  };

  test("scatters N points strictly inside the polygon", () => {
    const pts = scatterInPolygon(square, 50);
    expect(pts).toHaveLength(50);
    for (const p of pts) {
      expect(p.lat).toBeGreaterThanOrEqual(0);
      expect(p.lat).toBeLessThanOrEqual(1);
      expect(p.lng).toBeGreaterThanOrEqual(0);
      expect(p.lng).toBeLessThanOrEqual(1);
    }
  });

  test("returns [] for invalid input", () => {
    expect(scatterInPolygon({ coordinates: [] }, 5)).toEqual([]);
    expect(scatterInPolygon(square, 0)).toEqual([]);
  });
});
