// In-memory fixed-window rate limiter for auth + public routes (/t/*, /g/*).
// PRD §6.13. Single-instance safe; document in code: a multi-instance
// production deploy should swap this for Redis/Upstash without changing call sites.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now(),
): { ok: boolean; remaining: number; resetAt: number } {
  const cur = buckets.get(key);
  if (!cur || now >= cur.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  cur.count += 1;
  return { ok: cur.count <= limit, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt };
}

/** Test seam. */
export function resetRateLimits(): void {
  buckets.clear();
}
