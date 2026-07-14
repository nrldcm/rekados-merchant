import { defineStore } from 'pinia'

/**
 * Auth store.
 *
 * The user identity is derived entirely from GET /auth/me — we NEVER read
 * tokens in JS (they live in httpOnly cookies) and we NEVER persist user PII
 * or tokens to localStorage. The store is in-memory only; a page refresh
 * re-hydrates via fetchMe().
 */

export type UserRole = 'USER' | 'MERCHANT' | 'RIDER' | 'ADMIN' | (string & {})

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  emailVerified?: boolean
  // Merchant-specific profile fields (populated once the backend exposes them).
  businessName?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isMerchant = computed(() => user.value?.role === 'MERCHANT')
  // A fresh self-signup is role USER; an admin promotes to MERCHANT later via
  // the console. Until then the merchant account is "pending approval".
  const isPendingApproval = computed(() => isAuthenticated.value && !isMerchant.value)

  /** Fetch the current user from the backend cookie session. */
  const fetchMe = async (): Promise<AuthUser | null> => {
    const api = useApi()
    loading.value = true
    try {
      const res = await api.get<{ user: AuthUser }>('/auth/me')
      user.value = res.user
      return res.user
    } catch {
      user.value = null
      return null
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  /** Ensure we've attempted to load the session at least once. */
  const ensureLoaded = async (): Promise<void> => {
    if (!initialized.value) await fetchMe()
  }

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    const api = useApi()
    // Backend sets httpOnly cookies on success.
    await api.post('/auth/login', payload)
    const me = await fetchMe()
    if (!me) throw new Error('Login succeeded but session could not be loaded.')
    return me
  }

  /**
   * Self-signup — email + password only.
   * The core creates a role USER account and emails a verification OTP. Role
   * assignment to MERCHANT is done later by an admin. Any merchant profile
   * fields (business name, address, …) must NOT be sent here — the backend
   * rejects unknown fields.
   */
  const signup = async (email: string, password: string): Promise<void> => {
    const api = useApi()
    await api.post<{ message: string }>('/auth/signup', { email, password })
  }

  /**
   * Verify the emailed OTP code. On success the backend auto-logs the user in
   * (sets httpOnly cookies) and returns the user, which we store directly.
   */
  const verifyEmail = async (email: string, code: string): Promise<AuthUser> => {
    const api = useApi()
    const res = await api.post<{ user: AuthUser }>('/auth/verify-email', { email, code })
    if (res?.user) {
      user.value = res.user
      initialized.value = true
    } else {
      // Fallback: hydrate from the freshly-set cookie session.
      await fetchMe()
    }
    if (!user.value) throw new Error('Verification succeeded but session could not be loaded.')
    return user.value
  }

  /** Re-send the email verification OTP. */
  const resendEmailOtp = async (email: string): Promise<void> => {
    const api = useApi()
    await api.post('/auth/resend-email-otp', { email })
  }

  const logout = async (): Promise<void> => {
    const api = useApi()
    try {
      await api.post('/auth/logout')
    } catch {
      // Even if the network call fails, drop local state.
    } finally {
      user.value = null
      if (import.meta.client) await navigateTo('/login')
    }
  }

  return {
    user,
    loading,
    initialized,
    isAuthenticated,
    isMerchant,
    isPendingApproval,
    fetchMe,
    ensureLoaded,
    login,
    signup,
    verifyEmail,
    resendEmailOtp,
    logout,
  }
})
