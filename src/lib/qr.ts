// QR + public-ID helpers, PRD §5.3 / §5.4.
// QR payload: https://<domain>/t/<nanoid>
import { customAlphabet } from "nanoid";
import QRCode from "qrcode";
import { envVar } from "./env";

// Ambiguous characters (0/O, 1/I/l) removed, the short-code is printed
// under each QR on the batch sheet for manual reference.
export const nanoidAlphabet =
  "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const newId = customAlphabet(nanoidAlphabet, 10);

/** Short, URL-safe, collision-resistant sapling identifier. */
export function newPublicId(): string {
  return newId();
}

export function appUrl(): string {
  return (envVar("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
}

export function saplingUrl(nanoid: string): string {
  return `${appUrl()}/t/${nanoid}`;
}

export function giftUrl(token: string): string {
  return `${appUrl()}/g/${token}`;
}

/** SVG markup stored on the sapling row (crisp at any print size). */
export async function qrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, { type: "svg", margin: 1, width: 256 });
}

/** PNG data-URL for embedding (OG images, PDF sheets, certificates). */
export async function qrPngDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { margin: 1, width: 512 });
}

// --- Location strategy (a): auto-scatter points inside a zone polygon --------

export type LngLat = [number, number]; // GeoJSON order

function bboxOf(ring: LngLat[]): [number, number, number, number] {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function inRing([x, y]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Uniform-ish random scatter of `count` points inside a GeoJSON Polygon's
 * outer ring (bbox rejection sampling). Pure + deterministic-safe for tests
 * when Math.random is stubbed. Returns [] for invalid input.
 */
export function scatterInPolygon(
  polygon: { type?: string; coordinates?: LngLat[][] },
  count: number,
  rand: () => number = Math.random,
): { lat: number; lng: number }[] {
  const ring = polygon?.coordinates?.[0];
  if (!ring || ring.length < 4 || count <= 0) return [];
  const [minX, minY, maxX, maxY] = bboxOf(ring);
  const pts: { lat: number; lng: number }[] = [];
  let guard = count * 200 + 100;
  while (pts.length < count && guard-- > 0) {
    const lng = minX + rand() * (maxX - minX);
    const lat = minY + rand() * (maxY - minY);
    if (inRing([lng, lat], ring)) pts.push({ lat, lng });
  }
  return pts;
}
