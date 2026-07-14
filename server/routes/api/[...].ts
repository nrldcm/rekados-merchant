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
 *
 * IMPORTANT: `event.path` already carries the full `/api/v1/...` prefix, so the
 * target must contribute ONLY its origin. We strip any path on API_PROXY_TARGET
 * (e.g. a mistaken trailing `/api/v1`) to avoid a doubled `/api/v1/api/v1/...`.
 */
export default defineEventHandler((event) => {
  const raw = process.env.API_PROXY_TARGET || 'http://localhost:4004'
  let origin: string
  try {
    origin = new URL(raw).origin
  } catch {
    origin = raw.replace(/\/+$/, '')
  }
  // Defensive: collapse any accidental double prefix.
  const path = event.path.replace(/^\/api\/v1\/api\/v1\//, '/api/v1/')
  return proxyRequest(event, `${origin}${path}`)
})
