<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'User Management — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { date } = useFormat()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Member {
  id: string
  user: { id: string; email: string; firstName: string; lastName: string; phone: string; emailVerified: boolean; mfaEnabled: boolean }
  branch: { id: string; name: string; type: 'MAIN' | 'SUB' }
  role: { id: string; name: string }
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  isOwner: boolean
}
interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
}
interface ActivityRow {
  id: string
  action: string
  targetType: string
  createdAt: string
  ip: string | null
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
const tab = ref<'members' | 'roles'>('members')

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const { data: members, pending: membersPending, refresh: refreshMembers } = await useAsyncData<Member[]>(
  () => `members-${merchant.activeBranchId}`,
  () => api.get<Member[]>('/merchant/members'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)
const { data: roles, pending: rolesPending, refresh: refreshRoles } = await useAsyncData<Role[]>(
  () => `roles-${merchant.activeBranchId}`,
  () => api.get<Role[]>('/merchant/roles'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

const fullName = (m: Member) => [m.user.firstName, m.user.lastName].filter(Boolean).join(' ')

// ---------------------------------------------------------------------------
// Members table
// ---------------------------------------------------------------------------
const memberColumns: Column<Member>[] = [
  { key: 'user', label: 'Member' },
  { key: 'branch', label: 'Branch' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' },
]

// ---- Invite member ----
const showInvite = ref(false)
const inviteForm = reactive({ email: '', branchId: '', roleId: '' })
const inviteSaving = ref(false)
const inviteError = ref<string | null>(null)

function openInvite() {
  inviteForm.email = ''
  inviteForm.branchId = merchant.activeBranch?.id ?? merchant.branches[0]?.id ?? ''
  inviteForm.roleId = roles.value?.[0]?.id ?? ''
  inviteError.value = null
  showInvite.value = true
}
async function submitInvite() {
  inviteSaving.value = true
  inviteError.value = null
  try {
    await api.post('/merchant/members/invite', {
      email: inviteForm.email,
      branchId: inviteForm.branchId,
      roleId: inviteForm.roleId,
    })
    showInvite.value = false
    await refreshMembers()
  } catch (e: unknown) {
    inviteError.value = (e as { message?: string })?.message || 'Could not send invite.'
  } finally {
    inviteSaving.value = false
  }
}

// ---- Change role ----
const roleModal = ref<Member | null>(null)
const roleForm = reactive({ roleId: '' })
const roleSaving = ref(false)
const roleError = ref<string | null>(null)

function openChangeRole(m: Member) {
  roleModal.value = m
  roleForm.roleId = m.role.id
  roleError.value = null
}
async function submitChangeRole() {
  if (!roleModal.value) return
  roleSaving.value = true
  roleError.value = null
  try {
    await api.patch(`/merchant/members/${roleModal.value.id}/role`, { roleId: roleForm.roleId })
    roleModal.value = null
    await refreshMembers()
  } catch (e: unknown) {
    roleError.value = (e as { message?: string })?.message || 'Could not change role.'
  } finally {
    roleSaving.value = false
  }
}

// ---- Remove member ----
async function removeMember(m: Member) {
  if (!confirm(`Remove ${m.user.email} from ${m.branch.name}?`)) return
  try {
    await api.del(`/merchant/members/${m.id}`)
    await refreshMembers()
  } catch (e: unknown) {
    alert((e as { message?: string })?.message || 'Could not remove member.')
  }
}

// ---- Activity logs ----
const activityMember = ref<Member | null>(null)
const activityRows = ref<ActivityRow[]>([])
const activityTotal = ref(0)
const activityLoading = ref(false)
const activityError = ref<string | null>(null)
const activitySkip = ref(0)
const ACTIVITY_TAKE = 20

async function loadActivity() {
  if (!activityMember.value) return
  activityLoading.value = true
  activityError.value = null
  try {
    const res = await api.get<{ total: number; rows: ActivityRow[] }>(
      `/merchant/members/${activityMember.value.user.id}/activity?skip=${activitySkip.value}&take=${ACTIVITY_TAKE}`,
    )
    activityRows.value = res.rows
    activityTotal.value = res.total
  } catch (e: unknown) {
    activityError.value = (e as { message?: string })?.message || 'Could not load activity.'
  } finally {
    activityLoading.value = false
  }
}
function openActivity(m: Member) {
  activityMember.value = m
  activitySkip.value = 0
  activityRows.value = []
  activityTotal.value = 0
  loadActivity()
}
function closeActivity() {
  activityMember.value = null
}
function activityPage(dir: -1 | 1) {
  const next = activitySkip.value + dir * ACTIVITY_TAKE
  if (next < 0 || next >= activityTotal.value) return
  activitySkip.value = next
  loadActivity()
}

// ---------------------------------------------------------------------------
// Roles tab — create / edit with permission matrix
// ---------------------------------------------------------------------------
const showRoleForm = ref(false)
const editingRole = ref<Role | null>(null)
const roleFormData = reactive({ name: '', description: '', permissions: [] as string[] })
const roleFormSaving = ref(false)
const roleFormError = ref<string | null>(null)

const catalogPerms = ref<string[]>([])
const catalogLoading = ref(false)

/** Permissions grouped by module (part before the ':'). */
const groupedCatalog = computed(() => {
  const groups: Record<string, string[]> = {}
  for (const perm of catalogPerms.value) {
    const mod = perm.split(':')[0]
    ;(groups[mod] ||= []).push(perm)
  }
  return Object.entries(groups)
    .map(([module, perms]) => ({ module, perms: perms.sort() }))
    .sort((a, b) => a.module.localeCompare(b.module))
})

async function ensureCatalog() {
  if (catalogPerms.value.length) return
  catalogLoading.value = true
  try {
    const res = await api.get<{ permissions: string[] }>('/merchant/roles/catalog')
    catalogPerms.value = res.permissions
  } catch (e: unknown) {
    roleFormError.value = (e as { message?: string })?.message || 'Could not load permission catalog.'
  } finally {
    catalogLoading.value = false
  }
}

async function openRoleCreate() {
  editingRole.value = null
  Object.assign(roleFormData, { name: '', description: '', permissions: [] as string[] })
  roleFormError.value = null
  showRoleForm.value = true
  await ensureCatalog()
}
async function openRoleEdit(r: Role) {
  editingRole.value = r
  Object.assign(roleFormData, { name: r.name, description: r.description ?? '', permissions: [...r.permissions] })
  roleFormError.value = null
  showRoleForm.value = true
  await ensureCatalog()
}
function togglePerm(perm: string, checked: boolean) {
  const set = new Set(roleFormData.permissions)
  if (checked) set.add(perm)
  else set.delete(perm)
  roleFormData.permissions = [...set]
}
async function saveRole() {
  roleFormSaving.value = true
  roleFormError.value = null
  try {
    if (editingRole.value) {
      await api.patch(`/merchant/roles/${editingRole.value.id}`, {
        description: roleFormData.description || undefined,
        permissions: roleFormData.permissions,
      })
    } else {
      await api.post('/merchant/roles', {
        name: roleFormData.name,
        description: roleFormData.description || undefined,
        permissions: roleFormData.permissions,
      })
    }
    showRoleForm.value = false
    await refreshRoles()
  } catch (e: unknown) {
    roleFormError.value = (e as { message?: string })?.message || 'Could not save role.'
  } finally {
    roleFormSaving.value = false
  }
}
async function deleteRole(r: Role) {
  if (r.isSystem) return
  if (!confirm(`Delete role "${r.name}"?`)) return
  try {
    await api.del(`/merchant/roles/${r.id}`)
    await refreshRoles()
  } catch (e: unknown) {
    alert((e as { message?: string })?.message || 'Could not delete role.')
  }
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Members, roles and access controls · {{ merchant.activeBranch?.name }}</p>
      </div>
    </header>

    <!-- No access -->
    <div v-if="!merchant.can('users:view')" class="card p-6 text-sm text-slate-500 dark:text-slate-400">
      You don’t have permission to view user management.
    </div>

    <template v-else>
      <!-- Tab switcher -->
      <div class="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900 sm:inline-flex">
        <button
          class="flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition sm:flex-none"
          :class="tab === 'members' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="tab = 'members'"
        >Members</button>
        <button
          class="flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition sm:flex-none"
          :class="tab === 'roles' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="tab = 'roles'"
        >Access &amp; Controls</button>
      </div>

      <!-- ================= MEMBERS ================= -->
      <section v-show="tab === 'members'">
        <div class="mb-3 flex justify-end">
          <Button v-if="merchant.can('users:manage')" @click="openInvite">+ Invite member</Button>
        </div>

        <DataTable :columns="memberColumns" :rows="members || []" :loading="membersPending" empty="No members yet.">
          <template #cell-user="{ row }">
            <div class="flex items-center gap-2">
              <div class="min-w-0">
                <div class="font-medium text-slate-900 dark:text-slate-100">{{ row.user.email }}</div>
                <div class="text-xs text-slate-400">
                  {{ fullName(row) || '—' }}
                  <span v-if="row.isOwner" class="ml-1 font-semibold text-brand-600 dark:text-brand-400">· Owner</span>
                </div>
              </div>
              <span
                v-if="row.user.mfaEnabled"
                class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                title="Two-factor authentication enabled"
              >2FA</span>
            </div>
          </template>
          <template #cell-branch="{ row }">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-700 dark:text-slate-200">{{ row.branch.name }}</span>
              <span
                class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                :class="row.branch.type === 'MAIN'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
              >{{ row.branch.type === 'MAIN' ? 'Main' : 'Sub' }}</span>
            </div>
          </template>
          <template #cell-role="{ row }">{{ row.role.name }}</template>
          <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1.5">
              <button
                v-if="merchant.can('users:view_logs')"
                class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="openActivity(row)"
              >Activity</button>
              <template v-if="merchant.can('users:manage') && !row.isOwner">
                <button
                  class="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                  @click="openChangeRole(row)"
                >Change role</button>
                <button
                  class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                  @click="removeMember(row)"
                >Remove</button>
              </template>
            </div>
          </template>
        </DataTable>
      </section>

      <!-- ================= ROLES ================= -->
      <section v-show="tab === 'roles'">
        <div class="mb-3 flex justify-end">
          <Button v-if="merchant.can('users:roles_manage')" @click="openRoleCreate">+ New role</Button>
        </div>

        <p v-if="rolesPending" class="text-sm text-slate-500">Loading…</p>
        <p v-else-if="!roles?.length" class="card p-6 text-sm text-slate-500 dark:text-slate-400">No roles defined.</p>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="r in roles"
            :key="r.id"
            class="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ r.name }}</h3>
                <p class="mt-0.5 text-xs text-slate-400">{{ r.description || 'No description' }}</p>
              </div>
              <span
                v-if="r.isSystem"
                class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >System</span>
            </div>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="p in r.permissions"
                :key="p"
                class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >{{ p }}</span>
              <span v-if="!r.permissions.length" class="text-xs text-slate-400">No permissions</span>
            </div>

            <div v-if="merchant.can('users:roles_manage') && !r.isSystem" class="mt-4 flex gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                @click="openRoleEdit(r)"
              >Edit</button>
              <button
                class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                @click="deleteRole(r)"
              >Delete</button>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ============ Invite modal ============ -->
    <Modal v-model="showInvite" title="Invite member">
      <div class="space-y-4">
        <TextField v-model="inviteForm.email" label="Email" name="inviteEmail" type="email" placeholder="person@example.com" :required="true" />
        <div>
          <label class="label-base" for="inviteBranch">Branch <span class="text-red-500">*</span></label>
          <select id="inviteBranch" v-model="inviteForm.branchId" class="input-base">
            <option v-for="b in merchant.branches" :key="b.id" :value="b.id">
              {{ b.name }} ({{ b.type === 'MAIN' ? 'Main' : 'Sub' }})
            </option>
          </select>
        </div>
        <div>
          <label class="label-base" for="inviteRole">Role <span class="text-red-500">*</span></label>
          <select id="inviteRole" v-model="inviteForm.roleId" class="input-base">
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <FormError v-if="inviteError" :message="inviteError" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showInvite = false">Cancel</Button>
        <Button :loading="inviteSaving" @click="submitInvite">Send invite</Button>
      </template>
    </Modal>

    <!-- ============ Change role modal ============ -->
    <Modal :model-value="!!roleModal" title="Change role" @update:model-value="roleModal = null">
      <div v-if="roleModal" class="space-y-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ roleModal.user.email }} · {{ roleModal.branch.name }}</p>
        <div>
          <label class="label-base" for="changeRole">Role</label>
          <select id="changeRole" v-model="roleForm.roleId" class="input-base">
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <FormError v-if="roleError" :message="roleError" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="roleModal = null">Cancel</Button>
        <Button :loading="roleSaving" @click="submitChangeRole">Save</Button>
      </template>
    </Modal>

    <!-- ============ Activity modal ============ -->
    <Modal :model-value="!!activityMember" title="Activity log" @update:model-value="closeActivity">
      <div v-if="activityMember" class="space-y-3">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ activityMember.user.email }}</p>

        <p v-if="activityLoading" class="text-sm text-slate-500">Loading…</p>
        <FormError v-else-if="activityError" :message="activityError" />
        <p v-else-if="!activityRows.length" class="text-sm text-slate-500">No activity recorded.</p>

        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
          <li v-for="a in activityRows" :key="a.id" class="py-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-slate-900 dark:text-slate-100">{{ a.action }}</span>
              <span class="text-xs text-slate-400">{{ date(a.createdAt) }}</span>
            </div>
            <div class="mt-0.5 text-xs text-slate-400">
              {{ a.targetType }}<span v-if="a.ip"> · {{ a.ip }}</span>
            </div>
          </li>
        </ul>

        <div v-if="activityTotal > ACTIVITY_TAKE" class="flex items-center justify-between pt-1">
          <span class="text-xs text-slate-400">
            {{ activitySkip + 1 }}–{{ Math.min(activitySkip + ACTIVITY_TAKE, activityTotal) }} of {{ activityTotal }}
          </span>
          <div class="flex gap-1.5">
            <Button variant="ghost" size="sm" :disabled="activitySkip === 0" @click="activityPage(-1)">Prev</Button>
            <Button variant="ghost" size="sm" :disabled="activitySkip + ACTIVITY_TAKE >= activityTotal" @click="activityPage(1)">Next</Button>
          </div>
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="closeActivity">Close</Button>
      </template>
    </Modal>

    <!-- ============ Role create/edit modal ============ -->
    <Modal v-model="showRoleForm" :title="editingRole ? 'Edit role' : 'New role'">
      <div class="space-y-4">
        <TextField v-model="roleFormData.name" label="Role name" name="roleName" :required="true" :disabled="!!editingRole" :hint="editingRole ? 'Role name cannot be changed' : undefined" />
        <TextField v-model="roleFormData.description" label="Description (optional)" name="roleDesc" />

        <div>
          <span class="label-base">Permissions</span>
          <p v-if="catalogLoading" class="text-sm text-slate-500">Loading catalog…</p>
          <div v-else class="mt-1 space-y-3">
            <div v-for="group in groupedCatalog" :key="group.module" class="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ group.module }}</p>
              <div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <label v-for="perm in group.perms" :key="perm" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    class="rounded"
                    :checked="roleFormData.permissions.includes(perm)"
                    @change="togglePerm(perm, ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ perm.split(':')[1] }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <FormError v-if="roleFormError" :message="roleFormError" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showRoleForm = false">Cancel</Button>
        <Button :loading="roleFormSaving" @click="saveRole">{{ editingRole ? 'Save' : 'Create' }}</Button>
      </template>
    </Modal>
  </div>
</template>
