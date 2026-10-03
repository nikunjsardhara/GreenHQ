import { describe, expect, test } from "bun:test";
import { contrastRatio, contrastText, luminance } from "../src/lib/color";

// Locks the palette contract: every standard pairing must stay WCAG AA
// (4.5:1 for normal text). If someone lightens a token, this fails first.
describe("palette contrast (WCAG AA)", () => {
  const pairs: [string, string, string][] = [
    ["body ink on app bg", "#1a2b1f", "#f6f8f4"],
    ["chip button text on chip bg", "#1a2b1f", "#ffffff"],
    ["muted small text on card", "#3f544a", "#ffffff"],
    ["muted small text on app bg", "#3f544a", "#f6f8f4"],
    ["white on brand", "#ffffff", "#2e7d32"],
    ["brand-ink links on card", "#1b5e20", "#ffffff"],
    ["danger on card", "#b3261e", "#ffffff"],
    ["warning on card", "#7a5200", "#ffffff"],
    ["nav labels on nav bar", "#cfe0d2", "#1a2b1f"],
    ["scan label on accent", "#3d2f00", "#f9a825"],
  ];
  for (const [name, fg, bg] of pairs) {
    test(`${name} ≥ 4.5:1`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("contrastText", () => {
  test("white over dark brand colors", () => {
    expect(contrastText("#2e7d32")).toBe("#ffffff");
    expect(contrastText("#1a2b1f")).toBe("#ffffff");
  });

  test("ink over pale brand colors (where assumed-white would fail)", () => {
    expect(contrastText("#f9a825")).toBe("#1a2b1f");
    expect(contrastText("#ffffff")).toBe("#1a2b1f");
    // The old assumption (always white) fails here, that's the bug it fixes:
    expect(contrastRatio("#ffffff", "#f9a825")).toBeLessThan(4.5);
  });

  test("luminance sanity", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
  });
});
