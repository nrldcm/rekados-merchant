import { proxyRequest } from 'h3'

/**
 * Same-origin API proxy.
 *
 * The browser only ever talks to THIS app's own origin under `/api/**`; we
 * forward those requests to the Rekados backend server-side. Benefits:
 *  - First-party cookies (no cross-site cookie caveats), no CORS.
 *  - The backend URL is never exposed to the browser.
 *  - E2E-encrypted request/response bodies pass through untouched.
 *
 * Target backend is configured at runtime via API_PROXY_TARGET.
 */
export default defineEventHandler((event) => {
  const target = process.env.API_PROXY_TARGET || 'http://localhost:4004'
  // event.path is the full incoming path incl. query, e.g. /api/v1/auth/login?x=1
  return proxyRequest(event, `${target}${event.path}`)
})
