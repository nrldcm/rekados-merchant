/**
 * Route middleware protecting the merchant app area.
 *
 *  1. Ensures the cookie session is loaded (GET /auth/me).
 *  2. Redirects unauthenticated users to /login (preserving intended path).
 *  3. Requires authentication only. A fresh self-signup is role USER — an admin
 *     promotes it to MERCHANT later via the console — so we do NOT hard-gate on
 *     role. Non-merchant accounts are allowed in and surface a non-blocking
 *     "pending approval" banner (see auth store `isPendingApproval` + app layout).
 *
 * Attach per-page with:  definePageMeta({ middleware: 'auth' })
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // Make sure we've tried to hydrate the session at least once.
  await auth.ensureLoaded()

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  // Authenticated but not yet a MERCHANT: allow access. The UI surfaces a
  // non-blocking "pending approval" banner rather than redirecting or crashing.
})
