/**
 * Centralized backend URL resolution.
 *
 * Problem we fix here: in production the deploy infrastructure (Cloudflare/edge)
 * 308-redirects "www.vocalfitness.org" → "vocalfitness.org". Browsers can lose
 * the POST body / change the method on such cross-origin redirects, breaking
 * /api/auth/login silently. Stripping the "www." subdomain on the client makes
 * every API call hit the canonical host directly, no redirect involved.
 *
 * Use BACKEND_URL everywhere instead of `process.env.REACT_APP_BACKEND_URL`.
 */
const raw = (process.env.REACT_APP_BACKEND_URL || '').trim();

export const BACKEND_URL = raw
  .replace(/^https:\/\/www\./i, 'https://')
  .replace(/^http:\/\/www\./i, 'http://')
  .replace(/\/+$/, ''); // strip trailing slash

export default BACKEND_URL;
