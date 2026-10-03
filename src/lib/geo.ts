// Geo helpers: polygon area for "hectares covered" stats (PRD §6.9 / §8).
// Equirectangular projection, accurate enough for plantation-zone display
// (error <1% for zones under a few km across).

export type LngLatRing = [number, number][];

const EARTH_M = 6371000;

/** Area of a GeoJSON outer ring in hectares. Returns 0 for invalid input. */
export function polygonAreaHa(ring: LngLatRing | undefined | null): number {
  if (!ring || ring.length < 4) return 0;
  const lat0 = ring.reduce((a, [, lat]) => a + lat, 0) / ring.length;
  const kx = (Math.PI / 180) * EARTH_M * Math.cos((lat0 * Math.PI) / 180);
  const ky = (Math.PI / 180) * EARTH_M;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += x1 * kx * y2 * ky - x2 * kx * y1 * ky;
  }
  return Math.abs(area / 2) / 10_000;
}

/** Area of a GeoJSON Polygon object in hectares. */
export function geojsonAreaHa(polygon: { coordinates?: LngLatRing[] } | null | undefined): number {
  return polygonAreaHa(polygon?.coordinates?.[0]);
}

/** Ray-casting point-in-ring test (GeoJSON `[lng, lat]` order). */
export function pointInRing(lng: number, lat: number, ring: LngLatRing): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Name of the first named zone containing the point (project sub-zones,
 * PRD §5.2). Returns null when unset, outside all zones, or on bad input.
 */
export function zoneContainingPoint(
  lat: number | null | undefined,
  lng: number | null | undefined,
  zones: { name: string; polygonGeojson: { coordinates?: LngLatRing[] } | null }[],
): string | null {
  if (lat == null || lng == null) return null;
  for (const z of zones) {
    const ring = z.polygonGeojson?.coordinates?.[0];
    if (ring && ring.length >= 4 && pointInRing(lng, lat, ring)) return z.name;
  }
  return null;
}
