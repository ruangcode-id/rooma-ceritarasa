/**
 * Extract the real client IP from proxy headers.
 * Uses the first hop in X-Forwarded-For (client), not the full chain.
 */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || null;
}

/**
 * Rate-limit key derived from client IP.
 * Never collapses unrelated clients into a shared "unknown" bucket.
 * - Production without IP → dedicated "missing-ip" key (rare behind Caddy)
 * - Development without IP → "dev-local"
 */
export function getRateLimitClientKey(headers: Headers): string {
  const ip = getClientIp(headers);
  if (ip) return ip;
  return process.env.NODE_ENV === "production" ? "missing-ip" : "dev-local";
}
