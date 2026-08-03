import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory, single-instance rate limiter — a best-effort brake on brute
 * force, not a distributed guarantee. A multi-instance deployment needs a
 * shared store (Redis, etc.) behind the same `checkRateLimit` signature.
 */
const buckets = new Map<string, Bucket>();

// Prevents unbounded growth from one-off keys (e.g. unique emails) that never come back.
const MAX_BUCKETS = 50_000;

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false };
  }

  bucket.count += 1;
  return { allowed: true };
}
