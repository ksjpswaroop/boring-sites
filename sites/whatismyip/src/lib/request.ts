/**
 * Extract the requester's IP from a Vercel/Cloudflare-served request.
 *
 * Order of precedence (matches the boring-sites no-logs standard):
 *   1. `x-forwarded-for` (first hop) — set by Vercel/Cloudflare
 *   2. `x-real-ip` — fallback
 *   3. `cf-connecting-ip` — Cloudflare edge (if in front)
 *   4. `127.0.0.1` — local development only, when no proxy header exists
 *   5. `'unknown'` — should never happen, but explicit beats crash
 *
 * This function does NOT log, store, or transmit the IP beyond
 * the immediate response.
 */

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated chain. First IP is the client.
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const host = new URL(request.url).hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return '127.0.0.1';
  }
  return 'unknown';
}

/**
 * Basic validation: is this a plausible IPv4 or IPv6 string?
 */
export function isValidIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split('.').every((octet) => {
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  }
  // IPv6 (basic shape check; full validation is complex)
  if (ip.includes(':') && ip.length >= 3) return true;
  return false;
}
