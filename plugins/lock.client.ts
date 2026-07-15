/**
 * Lock Mode driver. Refreshes lock state on load, engages the server-side lock
 * after 15 minutes idle, and — the instant the session locks (idle or a 423
 * from the API) — routes to the full-page /locked screen so no app content is
 * left rendered behind an overlay.
 */
const IDLE_MS = 15 * 60 * 1000

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  const { status, locked, refresh, engage } = useLockMode()
  const router = useRouter()

  const goLocked = () => {
    const cur = router.currentRoute.value
    if (cur.path !== '/locked') {
      navigateTo(`/locked?next=${encodeURIComponent(cur.fullPath)}`)
    }
  }

  // Pull current lock state on load; if already locked, go straight to /locked.
  refresh().then(() => {
    if (locked.value) goLocked()
  })

  // Redirect the moment the session becomes locked from anywhere.
  watch(locked, (v) => {
    if (v) goLocked()
  })

  let timer: ReturnType<typeof setTimeout> | null = null
  const arm = () => {
    if (timer) clearTimeout(timer)
    if (!status.value.enabled || !status.value.pinSet || locked.value) return
    timer = setTimeout(() => engage(), IDLE_MS)
  }
  const onActivity = () => {
    if (!locked.value) arm()
  }
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
  events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })

  watch(
    () => [status.value.enabled, status.value.pinSet, locked.value],
    () => arm(),
    { immediate: true },
  )
})
