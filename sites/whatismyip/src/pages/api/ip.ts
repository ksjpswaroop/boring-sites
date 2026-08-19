import type { APIRoute } from 'astro';
import { getRequestIp, isValidIp } from '../../lib/request';

export const prerender = false;

/**
 * IP echo endpoint.
 *
 * Returns the requester's public IP. The endpoint:
 * - Does NOT log the IP anywhere (no server logs, no DB)
 * - Does NOT set any cookies
 * - Sets `Cache-Control: no-store` so it never gets cached
 * - Is rate-limited at the Vercel edge by default
 *
 * Used by the client-side DNS leak test to confirm IP consistency
 * across multiple sub-resource fetches.
 */
export const GET: APIRoute = async ({ request }) => {
  const ip = getRequestIp(request);
  const valid = isValidIp(ip);

  return new Response(
    JSON.stringify({
      ip: valid ? ip : null,
      // We deliberately do NOT return: country, city, ISP, user-agent, referer
      // We deliberately do NOT set: cookies, analytics beacons
    }),
    {
      status: valid ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    }
  );
};
