// QR payload layer: URL building plus real QR encoding output.
import { describe, expect, test } from "bun:test";
import {
  giftUrl,
  qrPngDataUrl,
  qrSvg,
  saplingUrl,
} from "../src/lib/qr";

describe("qr payloads", () => {
  test("sapling + gift urls embed their identifiers", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://trees.example.org/";
    expect(saplingUrl("abc123")).toBe("https://trees.example.org/t/abc123");
    expect(giftUrl("tok456")).toBe("https://trees.example.org/g/tok456");
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  test("server SVG is real vector markup, not a placeholder", async () => {
    const svg = await qrSvg("https://trees.example.org/t/abc123");
    expect(svg).toMatch(/^<svg[^>]*>/);
    expect(svg).toContain("<path");
    expect(svg.length).toBeGreaterThan(500);
  });

  test("same payload encodes deterministically (print sheet == stored QR)", async () => {
    const a = await qrSvg("https://trees.example.org/t/abc123");
    const b = await qrSvg("https://trees.example.org/t/abc123");
    expect(a).toBe(b);
    expect(await qrSvg("https://trees.example.org/t/other")).not.toBe(a);
  });

  test("PNG data-url has the right envelope for OG/certificate embedding", async () => {
    const png = await qrPngDataUrl("https://trees.example.org/t/abc123");
    expect(png.startsWith("data:image/png;base64,")).toBe(true);
    expect(png.length).toBeGreaterThan(1000);
  });
});
