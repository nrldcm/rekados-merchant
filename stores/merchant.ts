import { defineStore } from 'pinia'

/**
 * Merchant/branch context for the console.
 *
 * Bootstraps GET /merchant/context → the merchant tenant + the caller's
 * memberships (one per branch, each with its own RBAC permission list). The
 * "active branch" drives every data request (sent as X-Branch-Id via useApi)
 * and which permissions apply. `can()` is the single RBAC gate used across the
 * UI — it mirrors the backend's permissionGranted (supports '*' and 'module:*').
 */

export type BranchType = 'MAIN' | 'SUB'
export type BranchStatus = 'PENDING_KYC' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export interface Membership {
  id: string
  branch: { id: string; name: string; type: BranchType; parentBranchId: string | null; status: BranchStatus }
  role: { id: string; name: string }
  permissions: string[]
  isOwner: boolean
}

export interface Merchant {
  id: string
  legalName: string
  tradeName: string | null
  slug: string | null
  status: string
}

function granted(perms: string[], required: string): boolean {
  if (perms.includes('*')) return true
  if (perms.includes(required)) return true
  const mod = required.split(':')[0]
  return perms.includes(`${mod}:*`)
}

export const useMerchantStore = defineStore('merchant', () => {
  const merchant = ref<Merchant | null>(null)
  const memberships = ref<Membership[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  // Persisted so the active branch survives reloads and is read by useApi.
  const activeBranchId = useCookie<string | null>('rk_active_branch', { sameSite: 'lax', path: '/' })

  const hasMerchant = computed(() => memberships.value.length > 0)
  const branches = computed(() => memberships.value.map((m) => m.branch))

  const activeMembership = computed<Membership | null>(() => {
    if (!memberships.value.length) return null
    return (
      memberships.value.find((m) => m.branch.id === activeBranchId.value) ??
      memberships.value.find((m) => m.branch.type === 'MAIN') ??
      memberships.value[0]
    )
  })

  const activeBranch = computed(() => activeMembership.value?.branch ?? null)
  const isMain = computed(() => activeBranch.value?.type === 'MAIN')
  const permissions = computed(() => activeMembership.value?.permissions ?? [])
  const isOwner = computed(() => !!activeMembership.value?.isOwner)
  const roleName = computed(() => activeMembership.value?.role.name ?? '')

  /** RBAC gate. `can('inventory:update')`. */
  function can(required: string): boolean {
    return granted(permissions.value, required)
  }
  /** True if ANY of the permissions is granted (menu visibility). */
  function canAny(...required: string[]): boolean {
    return required.some((p) => granted(permissions.value, p))
  }

  function apply(payload: { merchant: Merchant | null; memberships: Membership[] }) {
    merchant.value = payload.merchant
    memberships.value = payload.memberships ?? []
    // Default active branch to MAIN (or first) if unset / no longer valid.
    const valid = memberships.value.some((m) => m.branch.id === activeBranchId.value)
    if (!valid) {
      const main = memberships.value.find((m) => m.branch.type === 'MAIN')
      activeBranchId.value = (main ?? memberships.value[0])?.branch.id ?? null
    }
  }

  async function bootstrap(force = false): Promise<void> {
    if (loaded.value && !force) return
    const api = useApi()
    loading.value = true
    try {
      const payload = await api.get<{ merchant: Merchant | null; memberships: Membership[] }>(
        '/merchant/context',
      )
      apply(payload)
    } catch {
      merchant.value = null
      memberships.value = []
    } finally {
      loaded.value = true
      loading.value = false
    }
  }

  function switchBranch(branchId: string) {
    if (memberships.value.some((m) => m.branch.id === branchId)) {
      activeBranchId.value = branchId
    }
  }

  async function register(payload: { legalName: string; tradeName?: string; mainBranchName?: string }) {
    const api = useApi()
    const res = await api.post<{ merchant: Merchant | null; memberships: Membership[] }>(
      '/merchant/register',
      payload,
    )
    apply(res)
    loaded.value = true
  }

  function reset() {
    merchant.value = null
    memberships.value = []
    loaded.value = false
    activeBranchId.value = null
  }

  return {
    merchant,
    memberships,
    loaded,
    loading,
    activeBranchId,
    hasMerchant,
    branches,
    activeMembership,
    activeBranch,
    isMain,
    isOwner,
    roleName,
    permissions,
    can,
    canAny,
    bootstrap,
    switchBranch,
    register,
    reset,
  }
})
