/**
 * Lock Mode idle watcher. When Lock Mode is enabled, engage the server-side
 * lock after 15 minutes with no user activity, so an unattended screen can't be
 * used without re-entering the PIN. Activity resets the timer.
 */
const IDLE_MS = 15 * 60 * 1000

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  const { status, locked, refresh, engage } = useLockMode()

  // Pull the current lock state on load (a reload of a locked session re-locks).
  refresh()

  let timer: ReturnType<typeof setTimeout> | null = null

  const arm = () => {
    if (timer) clearTimeout(timer)
    if (!status.value.enabled || !status.value.pinSet || locked.value) return
    timer = setTimeout(() => engage(), IDLE_MS)
  }

  const onActivity = () => {
    if (locked.value) return
    arm()
  }

  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
  events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

  // Lock immediately when the tab is hidden for a while is handled by the idle
  // timer; also re-check state when the tab regains focus.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })

  // Re-arm whenever enablement changes.
  watch(
    () => [status.value.enabled, status.value.pinSet, locked.value],
    () => arm(),
    { immediate: true },
  )
})
