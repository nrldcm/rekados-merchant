<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'KYC — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { day, date } = useFormat()

type DocStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'
type DocType = 'BIR' | 'DTI' | 'SEC' | 'MAYORS_PERMIT' | 'BUSINESS_PERMIT' | 'SANITARY_PERMIT' | 'FIRE_PERMIT' | 'OTHER'

interface KybDoc {
  id: string
  type: string
  number: string | null
  ref: string | null
  status: DocStatus
  issuedAt: string | null
  expiresAt: string | null
  createdAt: string
}
interface KybBranch { id: string; name: string; status: string; type: string }
interface KybStatus {
  branch: KybBranch
  current: { id: string; status: string; documents: KybDoc[] } | null
  documents: KybDoc[]
}
interface KybHistory { id: string; status: string; createdAt: string; documents: KybDoc[] }

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'BIR', label: 'BIR Registration' },
  { value: 'DTI', label: 'DTI Registration' },
  { value: 'SEC', label: 'SEC Registration' },
  { value: 'MAYORS_PERMIT', label: "Mayor's Permit" },
  { value: 'BUSINESS_PERMIT', label: 'Business Permit' },
  { value: 'SANITARY_PERMIT', label: 'Sanitary Permit' },
  { value: 'FIRE_PERMIT', label: 'Fire Safety Permit' },
  { value: 'OTHER', label: 'Other' },
]
const typeLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label ?? t

const { data: status, pending, refresh } = await useAsyncData<KybStatus | null>(
  () => `kyb-status-${merchant.activeBranchId}`,
  () => api.get<KybStatus>('/merchant/kyb/status'),
  { watch: [() => merchant.activeBranchId], default: () => null },
)
const { data: history, refresh: refreshHistory } = await useAsyncData<KybHistory[]>(
  () => `kyb-history-${merchant.activeBranchId}`,
  () => api.get<KybHistory[]>('/merchant/kyb/history'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

const branch = computed(() => status.value?.branch ?? merchant.activeBranch)
const documents = computed<KybDoc[]>(() => status.value?.documents ?? [])

// ---- Expiry helpers ----
const NEAR_MS = 30 * 24 * 60 * 60 * 1000
function expiryState(d: KybDoc): 'expired' | 'near' | 'ok' | 'none' {
  if (d.status === 'EXPIRED') return 'expired'
  if (!d.expiresAt) return 'none'
  const diff = new Date(d.expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  if (diff <= NEAR_MS) return 'near'
  return 'ok'
}
const needsReverify = (d: KybDoc) =>
  d.status === 'EXPIRED' || d.status === 'REJECTED' || expiryState(d) !== 'ok' && expiryState(d) !== 'none'

const columns: Column<KybDoc>[] = [
  { key: 'type', label: 'Document' },
  { key: 'number', label: 'Number' },
  { key: 'status', label: 'Status' },
  { key: 'issuedAt', label: 'Issued' },
  { key: 'expiresAt', label: 'Expires' },
  { key: 'ref', label: '', align: 'right' },
]

// ---- Submit for verification (multiple rows) ----
interface DraftDoc { type: DocType; number: string; ref: string; issuedAt: string; expiresAt: string }
const emptyDraft = (): DraftDoc => ({ type: 'BIR', number: '', ref: '', issuedAt: '', expiresAt: '' })

const showSubmit = ref(false)
const drafts = ref<DraftDoc[]>([])
const submitting = ref(false)
const submitError = ref<string | null>(null)

function openSubmit() {
  drafts.value = [emptyDraft()]
  submitError.value = null
  showSubmit.value = true
}
function addRow() {
  drafts.value.push(emptyDraft())
}
function removeRow(idx: number) {
  drafts.value.splice(idx, 1)
}
function serialize(d: DraftDoc) {
  return {
    type: d.type,
    number: d.number || undefined,
    ref: d.ref || undefined,
    issuedAt: d.issuedAt || undefined,
    expiresAt: d.expiresAt || undefined,
  }
}
async function submitForVerification() {
  if (!drafts.value.length) {
    submitError.value = 'Add at least one document.'
    return
  }
  submitting.value = true
  submitError.value = null
  try {
    await api.post('/merchant/kyb/submit', { documents: drafts.value.map(serialize) })
    showSubmit.value = false
    await Promise.all([refresh(), refreshHistory()])
  } catch (e: unknown) {
    submitError.value = (e as { message?: string })?.message || 'Could not submit for verification.'
  } finally {
    submitting.value = false
  }
}

// ---- Add single document ----
const showAdd = ref(false)
const addForm = ref<DraftDoc>(emptyDraft())
const adding = ref(false)
const addError = ref<string | null>(null)

function openAdd() {
  addForm.value = emptyDraft()
  addError.value = null
  showAdd.value = true
}
async function addDocument() {
  adding.value = true
  addError.value = null
  try {
    await api.post('/merchant/kyb/documents', serialize(addForm.value))
    showAdd.value = false
    await Promise.all([refresh(), refreshHistory()])
  } catch (e: unknown) {
    addError.value = (e as { message?: string })?.message || 'Could not add document.'
  } finally {
    adding.value = false
  }
}

const canSubmit = computed(() => merchant.can('kyc:submit'))
const canView = computed(() => merchant.can('kyc:view'))
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">KYC</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Business verification (KYB) for this branch</p>
        </div>
        <div v-if="branch" class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ branch.name }}</span>
          <StatusBadge :status="branch.status" />
        </div>
      </div>
      <div v-if="canSubmit && canView" class="flex gap-2">
        <Button variant="ghost" @click="openAdd">+ Add document</Button>
        <Button @click="openSubmit">Submit for verification</Button>
      </div>
    </header>

    <div v-if="!canView" class="card p-6 text-sm text-slate-500 dark:text-slate-400">
      You don’t have permission to view KYC for this branch.
    </div>

    <template v-else>
      <!-- How it works -->
      <div class="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-200">
        Submitting for verification sets this branch to <strong>Pending Kyc</strong> while an admin reviews your
        documents. Once approved the branch becomes <strong>Active</strong>. Expired or rejected documents require
        re-verification — re-submit updated documents to restore your branch.
      </div>

      <!-- Documents -->
      <section class="mb-6">
        <h2 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Documents</h2>
        <DataTable :columns="columns" :rows="documents" :loading="pending" empty="No documents submitted yet.">
          <template #cell-type="{ row }">
            <div class="font-medium text-slate-900 dark:text-slate-100">{{ typeLabel(row.type) }}</div>
            <div v-if="needsReverify(row)" class="text-xs font-medium text-amber-600 dark:text-amber-400">
              ⟳ Re-verify needed — re-submit this document
            </div>
          </template>
          <template #cell-number="{ row }">
            <span class="text-slate-600 dark:text-slate-300">{{ row.number || '—' }}</span>
          </template>
          <template #cell-status="{ row }">
            <span
              v-if="row.status === 'EXPIRED'"
              class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300"
            >Expired</span>
            <StatusBadge v-else :status="row.status" />
          </template>
          <template #cell-issuedAt="{ row }">{{ day(row.issuedAt) }}</template>
          <template #cell-expiresAt="{ row }">
            <span
              :class="{
                'font-semibold text-red-600 dark:text-red-400': expiryState(row) === 'expired',
                'font-semibold text-amber-600 dark:text-amber-400': expiryState(row) === 'near',
              }"
            >{{ day(row.expiresAt) }}</span>
          </template>
          <template #cell-ref="{ row }">
            <a
              v-if="row.ref"
              :href="row.ref"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >View link ↗</a>
            <span v-else class="text-xs text-slate-400">—</span>
          </template>
        </DataTable>
      </section>

      <!-- History -->
      <section>
        <h2 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Verification history</h2>
        <p v-if="!history?.length" class="card p-4 text-sm text-slate-500 dark:text-slate-400">
          No past submissions.
        </p>
        <ul v-else class="space-y-2">
          <li
            v-for="h in history"
            :key="h.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center gap-3">
              <StatusBadge :status="h.status" />
              <span class="text-sm text-slate-600 dark:text-slate-300">
                {{ h.documents?.length || 0 }} document{{ (h.documents?.length || 0) === 1 ? '' : 's' }}
              </span>
            </div>
            <span class="text-xs text-slate-400">{{ date(h.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </template>

    <!-- Submit for verification modal -->
    <Modal v-model="showSubmit" title="Submit for verification">
      <div class="space-y-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Add every business document for this branch. Submitting sets the branch to <strong>Pending Kyc</strong> for
          admin review. There is no file upload yet — paste a link to each document.
        </p>
        <div class="space-y-3">
          <div
            v-for="(d, idx) in drafts"
            :key="idx"
            class="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Document {{ idx + 1 }}</span>
              <button
                v-if="drafts.length > 1"
                type="button"
                class="text-slate-400 hover:text-red-500"
                aria-label="Remove document"
                @click="removeRow(idx)"
              >✕</button>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="label-base">Type</label>
                <select v-model="d.type" class="input-base">
                  <option v-for="t in DOC_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <TextField v-model="d.number" label="Document number" name="number" placeholder="Optional" />
            </div>
            <div class="mt-3">
              <TextField v-model="d.ref" label="Document reference / link" name="ref" placeholder="https://…" />
            </div>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label class="label-base">Issued</label>
                <input v-model="d.issuedAt" type="date" class="input-base" >
              </div>
              <div>
                <label class="label-base">Expires</label>
                <input v-model="d.expiresAt" type="date" class="input-base" >
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="text-xs font-medium text-brand-600 dark:text-brand-400" @click="addRow">
          + Add another document
        </button>
        <FormError v-if="submitError" :message="submitError" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showSubmit = false">Cancel</Button>
        <Button :loading="submitting" @click="submitForVerification">Submit for review</Button>
      </template>
    </Modal>

    <!-- Add single document modal -->
    <Modal v-model="showAdd" title="Add document">
      <div class="space-y-4">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Attach a single document to this branch’s current verification.
        </p>
        <div>
          <label class="label-base">Type</label>
          <select v-model="addForm.type" class="input-base">
            <option v-for="t in DOC_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <TextField v-model="addForm.number" label="Document number" name="add-number" placeholder="Optional" />
        <TextField v-model="addForm.ref" label="Document reference / link" name="add-ref" placeholder="https://…" />
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label-base">Issued</label>
            <input v-model="addForm.issuedAt" type="date" class="input-base" >
          </div>
          <div>
            <label class="label-base">Expires</label>
            <input v-model="addForm.expiresAt" type="date" class="input-base" >
          </div>
        </div>
        <FormError v-if="addError" :message="addError" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showAdd = false">Cancel</Button>
        <Button :loading="adding" @click="addDocument">Add document</Button>
      </template>
    </Modal>
  </div>
</template>
