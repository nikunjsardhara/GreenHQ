import { describe, expect, test } from "bun:test";
import { uniqueByName, uniqueSpecies } from "../src/lib/species";

describe("uniqueSpecies", () => {
  test("drops duplicate common names, keeping the first row", () => {
    const rows = [
      { id: "global-neem", commonName: "Neem" },
      { id: "org-neem", commonName: "neem" },
      { id: "mango", commonName: "Mango" },
      { id: "org-neem-2", commonName: "  Neem " },
    ];
    expect(uniqueSpecies(rows)).toEqual([
      { id: "global-neem", commonName: "Neem" },
      { id: "mango", commonName: "Mango" },
    ]);
  });

  test("empty list stays empty", () => {
    expect(uniqueSpecies([])).toEqual([]);
  });
});

describe("uniqueByName", () => {
  test("dedupes facets by name", () => {
    const facets = [
      { id: "a", name: "Jamun", count: 50 },
      { id: "b", name: "jamun", count: 2 },
      { id: "c", name: "Mango", count: 12 },
    ];
    expect(uniqueByName(facets, (f) => f.name)).toEqual([
      { id: "a", name: "Jamun", count: 50 },
      { id: "c", name: "Mango", count: 12 },
    ]);
  });
});
