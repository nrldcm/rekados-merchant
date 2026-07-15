/**
 * Lock Mode (client side). The authoritative lock lives on the server (Redis);
 * this composable mirrors it, drives the PIN overlay, and engages the lock on
 * idle. Because the server rejects locked sessions with 423, the overlay can't
 * be bypassed by tampering with client state — unlocking requires the PIN.
 */
export interface LockStatus {
  enabled: boolean
  pinSet: boolean
  locked: boolean
}

export const useLockMode = () => {
  const api = useApi()
  const locked = useState<boolean>('lock:locked', () => false)
  const status = useState<LockStatus>('lock:status', () => ({
    enabled: false,
    pinSet: false,
    locked: false,
  }))

  async function refresh() {
    try {
      const s = await api.get<LockStatus>('/me/lock')
      status.value = s
      locked.value = s.locked
    } catch {
      /* not signed in / offline — leave as-is */
    }
  }

  /** Engage the lock now (idle timeout or manual). No-op if Lock Mode is off. */
  async function engage() {
    if (!status.value.enabled || !status.value.pinSet) return
    locked.value = true
    try {
      await api.post('/me/lock/engage')
    } catch {
      /* the overlay is already up; server will confirm on next call */
    }
  }

  async function unlock(pin: string) {
    await api.post('/me/lock/verify', { pin })
    locked.value = false
  }

  return { locked, status, refresh, engage, unlock }
}
