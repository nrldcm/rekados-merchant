/**
 * Route middleware protecting the merchant app area.
 *
 *  1. Ensures the cookie session is loaded (GET /auth/me).
 *  2. Redirects unauthenticated users to /login (preserving intended path).
 *  3. Gates on role === 'MERCHANT'. A logged-in non-merchant sees an explicit
 *     "Not authorized" screen (403) rather than being bounced to login.
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

  if (!auth.isMerchant) {
    // Authenticated but wrong role — render an explicit not-authorized screen.
    return abortNavigation(
      createError({
        statusCode: 403,
        statusMessage: 'Not authorized — this area is for Rekados merchant accounts only.',
      }),
    )
  }
})
