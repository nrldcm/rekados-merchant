/**
 * Global lock gate. While the session is locked, EVERY app route redirects to
 * the full-page /locked screen — so app content is never rendered (nothing to
 * reveal by deleting a DOM node). The server independently rejects locked
 * sessions with 423, so this is UX on top of a real server control.
 */
const ALLOW = new Set([
  '/locked',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
])

export default defineNuxtRouteMiddleware((to) => {
  // Don't gate a logged-out user — they belong on /login, not /locked.
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return

  const { locked } = useLockMode()
  if (locked.value && !ALLOW.has(to.path)) {
    return navigateTo(`/locked?next=${encodeURIComponent(to.fullPath)}`)
  }
})
