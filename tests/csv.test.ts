import { describe, expect, test } from "bun:test";
import { parseCsv, toCsv } from "../src/lib/csv";

describe("csv", () => {
  test("round-trips commas, quotes and newlines", () => {
    const rows = [
      { name: "Neem, hardy", note: 'Said "grow!" loudly' },
      { name: "Peepal", note: "line1\nline2" },
    ];
    const parsed = parseCsv(toCsv(rows, ["name", "note"]));
    expect(parsed).toEqual([
      ["name", "note"],
      ["Neem, hardy", 'Said "grow!" loudly'],
      ["Peepal", "line1\nline2"],
    ]);
  });

  test("empty fields survive", () => {
    expect(parseCsv(toCsv([{ a: "", b: null }], ["a", "b"]))).toEqual([["a", "b"], ["", ""]]);
  });
});
