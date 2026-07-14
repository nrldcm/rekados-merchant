import { defineStore } from 'pinia'

/**
 * Auth store.
 *
 * The user identity is derived entirely from GET /auth/me — we NEVER read
 * tokens in JS (they live in httpOnly cookies) and we NEVER persist user PII
 * or tokens to localStorage. The store is in-memory only; a page refresh
 * re-hydrates via fetchMe().
 */

export type UserRole = 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | (string & {})

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  // Merchant-specific profile fields (populated once the backend exposes them).
  businessName?: string
  emailVerified?: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterMerchantPayload {
  businessName: string
  ownerName: string
  email: string
  phone: string
  password: string
  storeAddress: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isMerchant = computed(() => user.value?.role === 'MERCHANT')

  /** Fetch the current user from the backend cookie session. */
  const fetchMe = async (): Promise<AuthUser | null> => {
    const api = useApi()
    loading.value = true
    try {
      const me = await api.get<AuthUser>('/auth/me')
      user.value = me
      return me
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
   * Merchant registration.
   * NOTE: Uses the shared POST /auth/register with merchant fields.
   * TODO(backend): a dedicated role/merchant-profile endpoint (e.g.
   * POST /merchants or a `role: 'MERCHANT'` claim on register) is still a
   * backend TODO — until then we pass merchant fields through and rely on the
   * backend to attach the MERCHANT role + store profile.
   */
  const register = async (payload: RegisterMerchantPayload): Promise<void> => {
    const api = useApi()
    await api.post('/auth/register', {
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      businessName: payload.businessName,
      ownerName: payload.ownerName,
      storeAddress: payload.storeAddress,
      role: 'MERCHANT',
    })
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
    fetchMe,
    ensureLoaded,
    login,
    register,
    logout,
  }
})
