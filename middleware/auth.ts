/**
 * Route middleware protecting the merchant console.
 *
 *  1. Ensures the cookie session is loaded (GET /auth/me).
 *  2. Redirects unauthenticated users to /login.
 *  3. Bootstraps the merchant/branch context (GET /merchant/context). An
 *     authenticated account with no merchant yet is sent to /onboard to
 *     register a business (which creates the tenant + main branch + owner).
 *
 * Attach per-page with:  definePageMeta({ middleware: 'auth' })
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  await auth.ensureLoaded()

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  const merchant = useMerchantStore()
  await merchant.bootstrap()

  // No merchant tenant yet → onboard (unless already there).
  if (!merchant.hasMerchant && to.path !== '/onboard') {
    return navigateTo('/onboard')
  }
  // Has a merchant but sitting on /onboard → go to the dashboard.
  if (merchant.hasMerchant && to.path === '/onboard') {
    return navigateTo('/app')
  }
})
