import { proxyRequest } from 'h3'

/**
 * Same-origin API proxy. `event.path` already carries the full `/api/v1/...`
 * prefix, so the target contributes only its origin (any path on
 * API_PROXY_TARGET is stripped to avoid a doubled `/api/v1/api/v1/...`).
 *
 * We inject `X-App-Audience` here, server-side, so the backend knows which app
 * the request came from. The browser CANNOT set/override it (it's added on the
 * server hop), which is what keeps accounts isolated per app.
 */
const APP_AUDIENCE = process.env.APP_AUDIENCE || 'MERCHANT'

export default defineEventHandler((event) => {
  const raw = process.env.API_PROXY_TARGET || 'http://localhost:4004'
  let origin: string
  try {
    origin = new URL(raw).origin
  } catch {
    origin = raw.replace(/\/+$/, '')
  }
  const path = event.path.replace(/^\/api\/v1\/api\/v1\//, '/api/v1/')
  return proxyRequest(event, `${origin}${path}`, {
    headers: { 'x-app-audience': APP_AUDIENCE },
  })
})
