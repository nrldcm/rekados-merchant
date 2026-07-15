<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Set up your business — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()

// BranchDocType — the backend enum, with friendly labels for the picker.
type DocType = 'BIR' | 'DTI' | 'SEC' | 'MAYORS_PERMIT' | 'BUSINESS_PERMIT' | 'SANITARY_PERMIT' | 'FIRE_PERMIT' | 'OTHER'
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

const MAX_BYTES = 8 * 1024 * 1024 // ~8MB client-side cap

// ---- KYB record shape (GET /kyb) — read defensively. ----
interface KybDoc {
  id?: string
  type: string
  number?: string | null
  ref?: string | null
  status?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
}
interface KybBranch { id: string; name: string; status: string; type?: string }
interface KybCurrent { id?: string; status?: string | null; rejectionReason?: string | null; reason?: string | null; documents?: KybDoc[] }
interface KybRecord {
  status?: string | null
  rejectionReason?: string | null
  reason?: string | null
  current?: KybCurrent | null
  documents?: KybDoc[]
  branch?: KybBranch | null
}

// Turn any thrown fetch error into the friendly message useApi already built.
const msg = (err: unknown, fallback: string) =>
  (err as { message?: string })?.message || fallback

// ---- Wizard state ----
type View = 'details' | 'documents' | 'review'
const view = ref<View>(merchant.hasMerchant ? 'review' : 'details')
const booting = ref(merchant.hasMerchant)

const stepNum = computed(() => (view.value === 'details' ? 1 : view.value === 'documents' ? 2 : 3))
const steps = [
  { n: 1, label: 'Business' },
  { n: 2, label: 'Documents' },
  { n: 3, label: 'Review' },
]

// ---- KYB record ----
const kyb = ref<KybRecord | null>(null)

const kybStatus = computed(() => (kyb.value?.current?.status ?? kyb.value?.status ?? '').toUpperCase())
const branchStatus = computed(() => (kyb.value?.branch?.status ?? merchant.activeBranch?.status ?? '').toUpperCase())
const rejectionReason = computed(
  () => kyb.value?.current?.rejectionReason ?? kyb.value?.current?.reason ?? kyb.value?.rejectionReason ?? kyb.value?.reason ?? null,
)
const submittedDocs = computed<KybDoc[]>(() => kyb.value?.documents ?? kyb.value?.current?.documents ?? [])
const hasSubmission = computed(() => {
  const s = kybStatus.value
  return s === 'PENDING' || s === 'REJECTED' || s === 'VERIFIED' || submittedDocs.value.length > 0
})

async function loadKyb() {
  try {
    kyb.value = await api.get<KybRecord>('/merchant/kyb/status')
  } catch {
    // No KYB submitted yet (or not reachable) — treat as "nothing submitted".
    kyb.value = null
  }
}

/** Decide which step to show from the current merchant + KYB state. */
function resolveView() {
  if (!merchant.hasMerchant) {
    view.value = 'details'
    return
  }
  if (branchStatus.value === 'ACTIVE' || kybStatus.value === 'VERIFIED') {
    navigateTo('/app')
    return
  }
  view.value = hasSubmission.value ? 'review' : 'documents'
}

// ---- Step 1: business details ----
const legalName = ref('')
const tradeName = ref('')
const mainBranchName = ref('')
const detailsSubmitting = ref(false)
const detailsError = ref<string | null>(null)

async function submitDetails() {
  detailsError.value = null
  if (legalName.value.trim().length < 2) {
    detailsError.value = 'Enter your registered business name.'
    return
  }
  detailsSubmitting.value = true
  try {
    await merchant.register({
      legalName: legalName.value.trim(),
      tradeName: tradeName.value.trim() || undefined,
      mainBranchName: mainBranchName.value.trim() || undefined,
    })
    // The profile is persisted now — drop the per-tab handoff stash.
    if (import.meta.client) {
      try { sessionStorage.removeItem('rekados.merchant.pendingProfile') } catch { /* non-fatal */ }
    }
    await loadKyb()
    resolveView() // → documents
  } catch (err: unknown) {
    detailsError.value = msg(err, 'Could not create your business. Please try again.')
  } finally {
    detailsSubmitting.value = false
  }
}

// ---- Step 2: KYB documents ----
interface DraftDoc {
  type: DocType
  number: string
  issuedAt: string
  expiresAt: string
  fileName: string
  ref: string
  uploading: boolean
  error: string | null
}
const emptyDraft = (): DraftDoc => ({
  type: 'BIR', number: '', issuedAt: '', expiresAt: '', fileName: '', ref: '', uploading: false, error: null,
})
const drafts = ref<DraftDoc[]>([emptyDraft()])
const docsSubmitting = ref(false)
const docsError = ref<string | null>(null)

function addDraft() {
  drafts.value.push(emptyDraft())
}
function removeDraft(idx: number) {
  drafts.value.splice(idx, 1)
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

async function onFile(idx: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const d = drafts.value[idx]
  d.error = null
  d.ref = ''
  d.fileName = ''
  if (!file) return

  const okType = file.type.startsWith('image/') || file.type === 'application/pdf'
  if (!okType) {
    d.error = 'Only images or PDF files are allowed.'
    input.value = ''
    return
  }
  if (file.size > MAX_BYTES) {
    d.error = 'That file is too large — please keep it under 8 MB.'
    input.value = ''
    return
  }

  d.fileName = file.name
  d.uploading = true
  try {
    const dataUrl = await fileToDataUrl(file)
    const res = await api.post<{ ref: string }>('/merchant/kyb/upload', { file: dataUrl })
    d.ref = res.ref
  } catch (err: unknown) {
    d.error = msg(err, 'Could not upload this file. Please try again.')
    d.fileName = ''
    input.value = ''
  } finally {
    d.uploading = false
  }
}

const serialize = (d: DraftDoc) => ({
  type: d.type,
  ref: d.ref || undefined,
  number: d.number.trim() || undefined,
  issuedAt: d.issuedAt || undefined,
  expiresAt: d.expiresAt || undefined,
})

async function submitDocuments() {
  docsError.value = null
  if (!drafts.value.length) {
    docsError.value = 'Add at least one document.'
    return
  }
  const types = drafts.value.map((d) => d.type)
  if (!types.includes('BIR') && !types.includes('DTI')) {
    docsError.value = 'Please include your BIR or DTI registration.'
    return
  }
  if (!types.includes('MAYORS_PERMIT') && !types.includes('BUSINESS_PERMIT')) {
    docsError.value = "Please include your Mayor's Permit or Business Permit."
    return
  }
  if (drafts.value.some((d) => d.uploading)) {
    docsError.value = 'Please wait for your files to finish uploading.'
    return
  }
  if (drafts.value.some((d) => !d.ref)) {
    docsError.value = 'Please attach a file for each document.'
    return
  }

  docsSubmitting.value = true
  try {
    await api.post('/merchant/kyb/submit', { documents: drafts.value.map(serialize) })
    await merchant.bootstrap(true) // refresh branch status (now PENDING_KYC)
    await loadKyb()
    view.value = 'review'
  } catch (err: unknown) {
    docsError.value = msg(err, 'Could not submit your documents. Please try again.')
  } finally {
    docsSubmitting.value = false
  }
}

function startResubmit() {
  drafts.value = [emptyDraft()]
  docsError.value = null
  view.value = 'documents'
}

// ---- Step 3: review ----
const refreshing = ref(false)
async function refreshStatus() {
  refreshing.value = true
  try {
    await Promise.all([loadKyb(), merchant.bootstrap(true)])
  } finally {
    refreshing.value = false
  }
  if (branchStatus.value === 'ACTIVE' || kybStatus.value === 'VERIFIED') {
    await navigateTo('/app')
  }
}

// ---- Boot ----
const cardTitle = computed(() =>
  view.value === 'details'
    ? 'Set up your business'
    : view.value === 'documents'
      ? 'Business verification (KYB)'
      : 'Verification in progress',
)
const cardSubtitle = computed(() =>
  view.value === 'details'
    ? 'Create your Rekados merchant and main branch.'
    : view.value === 'documents'
      ? 'Submit your permits and registrations to activate your branch.'
      : "We're reviewing your documents.",
)

onMounted(async () => {
  // Pre-fill the business name from the profile stashed at sign-up.
  if (!merchant.hasMerchant && import.meta.client) {
    try {
      const raw = sessionStorage.getItem('rekados.merchant.pendingProfile')
      if (raw) {
        const p = JSON.parse(raw) as { businessName?: string }
        if (p.businessName && !legalName.value) legalName.value = p.businessName
      }
    } catch { /* non-fatal — the stash is optional */ }
  }
  if (merchant.hasMerchant) {
    await loadKyb()
    resolveView()
  }
  booting.value = false
})
</script>

<template>
  <AuthCard :title="cardTitle" :subtitle="cardSubtitle">
    <!-- Step indicator -->
    <ol class="mb-6 flex items-center gap-2" aria-label="Onboarding steps">
      <li v-for="(s, i) in steps" :key="s.n" class="flex flex-1 items-center gap-2">
        <span
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="
            stepNum > s.n
              ? 'bg-brand-600 text-white'
              : stepNum === s.n
                ? 'bg-brand-600 text-white'
                : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          "
        >{{ stepNum > s.n ? '✓' : s.n }}</span>
        <span
          class="hidden text-xs font-medium sm:inline"
          :class="stepNum >= s.n ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'"
        >{{ s.label }}</span>
        <span v-if="i < steps.length - 1" class="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </li>
    </ol>

    <!-- Booting spinner while we load the KYB state for an existing merchant -->
    <div v-if="booting" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
      Loading…
    </div>

    <!-- Step 1: business details -->
    <form v-else-if="view === 'details'" novalidate @submit.prevent="submitDetails">
      <div class="space-y-4">
        <TextField
          v-model="legalName"
          label="Registered business name"
          name="legalName"
          placeholder="Juan Dela Cruz Trading"
          :required="true"
        />
        <TextField
          v-model="tradeName"
          label="Store / trade name (optional)"
          name="tradeName"
          placeholder="Juan's Kitchen"
        />
        <TextField
          v-model="mainBranchName"
          label="Main branch name (optional)"
          name="mainBranchName"
          placeholder="Main Branch — Cebu City"
        />

        <FormError :message="detailsError" />

        <p class="text-xs text-slate-500 dark:text-slate-400">
          This creates your merchant account, its main branch, and makes you the Owner.
          Next you'll submit your business documents (KYB) to activate the branch.
        </p>

        <Button type="submit" :loading="detailsSubmitting" :block="true">Continue</Button>
      </div>
    </form>

    <!-- Step 2: KYB documents -->
    <form v-else-if="view === 'documents'" novalidate @submit.prevent="submitDocuments">
      <div class="space-y-4">
        <div class="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-200">
          Upload your business documents. You'll need at least your <strong>BIR</strong> or
          <strong>DTI</strong> registration and your <strong>Mayor's</strong> or
          <strong>Business Permit</strong>. Images or PDF, up to 8&nbsp;MB each.
        </div>

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
                @click="removeDraft(idx)"
              >✕</button>
            </div>

            <div class="space-y-3">
              <div>
                <label class="label-base">Document type</label>
                <select v-model="d.type" class="input-base">
                  <option v-for="t in DOC_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>

              <TextField
                v-model="d.number"
                label="Document number (optional)"
                :name="`doc-number-${idx}`"
                placeholder="e.g. registration no."
              />

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label-base">Issued (optional)</label>
                  <input v-model="d.issuedAt" type="date" class="input-base" >
                </div>
                <div>
                  <label class="label-base">Expires (optional)</label>
                  <input v-model="d.expiresAt" type="date" class="input-base" >
                </div>
              </div>

              <div>
                <label class="label-base">File</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-brand-700 dark:text-slate-300"
                  @change="onFile(idx, $event)"
                >
                <p v-if="d.uploading" class="mt-1 text-xs text-slate-500 dark:text-slate-400">Uploading…</p>
                <p v-else-if="d.ref && d.fileName" class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ {{ d.fileName }} attached
                </p>
                <FormError :message="d.error" />
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="text-xs font-medium text-brand-600 dark:text-brand-400" @click="addDraft">
          + Add another document
        </button>

        <FormError :message="docsError" />

        <Button type="submit" :loading="docsSubmitting" :block="true">Submit for verification</Button>
      </div>
    </form>

    <!-- Step 3: review -->
    <div v-else class="space-y-4">
      <div v-if="merchant.activeBranch" class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ merchant.activeBranch.name }}</span>
        <StatusBadge :status="branchStatus || merchant.activeBranch.status" />
      </div>

      <!-- Rejected → show reason + resubmit -->
      <template v-if="kybStatus === 'REJECTED'">
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300" role="alert">
          <p class="font-semibold">Your submission was rejected.</p>
          <p v-if="rejectionReason" class="mt-1">{{ rejectionReason }}</p>
          <p v-else class="mt-1">Please review your documents and submit again.</p>
        </div>
        <Button :block="true" @click="startResubmit">Resubmit documents</Button>
      </template>

      <!-- Pending review -->
      <template v-else>
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
          <p class="font-semibold">Your documents are under review.</p>
          <p class="mt-1">
            An admin is verifying your submission. Once approved, your branch becomes
            <strong>Active</strong> and you'll get full access to the console. This usually
            takes a little while — you can safely close this page and check back later.
          </p>
        </div>

        <div v-if="submittedDocs.length" class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <p class="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Submitted documents</p>
          <ul class="space-y-1.5">
            <li v-for="(doc, i) in submittedDocs" :key="doc.id ?? i" class="flex items-center justify-between gap-2 text-sm">
              <span class="text-slate-700 dark:text-slate-200">{{ typeLabel(doc.type) }}</span>
              <StatusBadge v-if="doc.status" :status="doc.status" />
            </li>
          </ul>
        </div>

        <Button variant="secondary" :block="true" :loading="refreshing" @click="refreshStatus">
          Refresh status
        </Button>
      </template>
    </div>
  </AuthCard>
</template>
