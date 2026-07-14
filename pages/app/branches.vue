<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Branches — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()

type BranchType = 'MAIN' | 'SUB'
type BranchStatus = 'PENDING_KYC' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

interface Branch {
  id: string
  name: string
  code: string | null
  type: BranchType
  status: BranchStatus
  parentBranchId: string | null
  line1: string | null
  city: string | null
  province: string | null
}
interface Role {
  id: string
  name: string
  isSystem: boolean
}

const { data: branches, pending, refresh } = await useAsyncData<Branch[]>(
  () => `branches-${merchant.activeBranchId}`,
  () => api.get<Branch[]>('/merchant/branches'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

const columns: Column<Branch>[] = [
  { key: 'name', label: 'Branch' },
  { key: 'code', label: 'Code' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' },
]

const location = (b: Branch) => [b.city, b.province].filter(Boolean).join(', ') || '—'

// ---- Create / edit sub-branch ----
const showForm = ref(false)
const editing = ref<Branch | null>(null)
const form = reactive({ name: '', code: '', city: '', province: '', line1: '' })
const saving = ref(false)
const error = ref<string | null>(null)

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', code: '', city: '', province: '', line1: '' })
  error.value = null
  showForm.value = true
}
function openEdit(b: Branch) {
  editing.value = b
  Object.assign(form, {
    name: b.name,
    code: b.code ?? '',
    city: b.city ?? '',
    province: b.province ?? '',
    line1: b.line1 ?? '',
  })
  error.value = null
  showForm.value = true
}

async function save() {
  saving.value = true
  error.value = null
  try {
    const payload = {
      name: form.name,
      code: form.code || undefined,
      line1: form.line1 || undefined,
      city: form.city || undefined,
      province: form.province || undefined,
    }
    if (editing.value) await api.patch(`/merchant/branches/${editing.value.id}`, payload)
    else await api.post('/merchant/branches', payload)
    showForm.value = false
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not save branch.'
  } finally {
    saving.value = false
  }
}

// ---- Status ----
const statusError = ref<string | null>(null)
async function setStatus(b: Branch, status: BranchStatus) {
  statusError.value = null
  try {
    await api.patch(`/merchant/branches/${b.id}/status`, { status })
    await refresh()
  } catch (e: unknown) {
    statusError.value = (e as { message?: string })?.message || 'Could not update status.'
  }
}

// ---- Delete ----
async function remove(b: Branch) {
  if (b.type === 'MAIN') return
  if (!confirm(`Delete branch "${b.name}"? This cannot be undone.`)) return
  statusError.value = null
  try {
    await api.del(`/merchant/branches/${b.id}`)
    await refresh()
  } catch (e: unknown) {
    statusError.value = (e as { message?: string })?.message || 'Could not delete branch.'
  }
}

// ---- Add account (invite member to a branch) ----
const showInvite = ref(false)
const inviteBranch = ref<Branch | null>(null)
const inviteForm = reactive({ email: '', roleId: '' })
const inviting = ref(false)
const inviteError = ref<string | null>(null)

const { data: roles } = await useAsyncData<Role[]>(
  () => `branch-roles-${merchant.activeBranchId}`,
  () => api.get<Role[]>('/merchant/roles'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

function openInvite(b: Branch) {
  inviteBranch.value = b
  Object.assign(inviteForm, { email: '', roleId: roles.value?.[0]?.id ?? '' })
  inviteError.value = null
  showInvite.value = true
}
async function submitInvite() {
  if (!inviteBranch.value) return
  inviting.value = true
  inviteError.value = null
  try {
    await api.post('/merchant/members/invite', {
      email: inviteForm.email,
      branchId: inviteBranch.value.id,
      roleId: inviteForm.roleId,
    })
    showInvite.value = false
  } catch (e: unknown) {
    inviteError.value = (e as { message?: string })?.message || 'Could not create account.'
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Branch Management</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Manage sub-branches and their staff accounts</p>
      </div>
      <Button v-if="merchant.isMain && merchant.can('branch:create')" @click="openCreate">+ New sub-branch</Button>
    </header>

    <p
      v-if="!merchant.isMain"
      class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
    >
      Branch management is available on the main branch only. Switch to your main branch to add or manage sub-branches.
    </p>

    <FormError v-if="statusError" :message="statusError" class="mb-3" />

    <DataTable :columns="columns" :rows="branches || []" :loading="pending" empty="No branches yet.">
      <template #cell-name="{ row }">
        <div class="flex items-center gap-2">
          <span class="font-medium text-slate-900 dark:text-slate-100">{{ row.name }}</span>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
            :class="row.type === 'MAIN'
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
          >{{ row.type === 'MAIN' ? 'Main' : 'Sub' }}</span>
        </div>
      </template>
      <template #cell-code="{ row }">{{ row.code || '—' }}</template>
      <template #cell-location="{ row }">{{ location(row) }}</template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-actions="{ row }">
        <div v-if="merchant.isMain" class="flex flex-wrap justify-end gap-1.5">
          <button
            v-if="merchant.can('branch:update')"
            class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="openEdit(row)"
          >Edit</button>
          <button
            v-if="merchant.can('branch:manage') && row.status !== 'ACTIVE'"
            class="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
            @click="setStatus(row, 'ACTIVE')"
          >Activate</button>
          <button
            v-if="merchant.can('branch:manage') && row.status === 'ACTIVE'"
            class="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
            @click="setStatus(row, 'SUSPENDED')"
          >Suspend</button>
          <button
            v-if="merchant.can('users:manage')"
            class="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30"
            @click="openInvite(row)"
          >Add account</button>
          <button
            v-if="merchant.can('branch:delete') && row.type !== 'MAIN'"
            class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            @click="remove(row)"
          >Delete</button>
        </div>
      </template>
    </DataTable>

    <!-- Create / edit sub-branch modal -->
    <Modal v-model="showForm" :title="editing ? 'Edit branch' : 'New sub-branch'">
      <div class="space-y-4">
        <TextField v-model="form.name" label="Branch name" name="name" placeholder="Quezon City Branch" :required="true" />
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField v-model="form.code" label="Code (optional)" name="code" placeholder="QC-01" />
          <TextField v-model="form.city" label="City" name="city" />
        </div>
        <TextField v-model="form.province" label="Province" name="province" />
        <TextField v-model="form.line1" label="Address line" name="line1" placeholder="Street / building" />
        <FormError v-if="error" :message="error" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showForm = false">Cancel</Button>
        <Button :loading="saving" @click="save">{{ editing ? 'Save' : 'Create' }}</Button>
      </template>
    </Modal>

    <!-- Add account modal -->
    <Modal v-model="showInvite" :title="`Add account · ${inviteBranch?.name ?? ''}`">
      <div class="space-y-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">Invite a staff member to this branch.</p>
        <TextField v-model="inviteForm.email" label="Email" name="email" type="email" autocomplete="email" :required="true" />
        <div>
          <label for="invite-role" class="label-base">Role</label>
          <select id="invite-role" v-model="inviteForm.roleId" class="input-base">
            <option v-if="!roles?.length" value="" disabled>No roles available</option>
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <FormError v-if="inviteError" :message="inviteError" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showInvite = false">Cancel</Button>
        <Button :loading="inviting" :disabled="!inviteForm.roleId" @click="submitInvite">Send invite</Button>
      </template>
    </Modal>
  </div>
</template>
