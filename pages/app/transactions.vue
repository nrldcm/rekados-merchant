<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Transactions — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso, date } = useFormat()

interface Txn {
  id: string
  type: string
  direction: 'CREDIT' | 'DEBIT'
  amount: string
  currency: string
  refType: string | null
  refId: string | null
  note: string | null
  createdAt: string
}
interface TxnPage {
  total: number
  rows: Txn[]
}

const TYPES = ['SALE', 'REFUND', 'PURCHASE', 'PAYOUT', 'ADJUSTMENT', 'FEE'] as const

// ---- Filters ----
const typeFilter = ref('') // '' = all
const branchFilter = ref('') // '' = all branches
const take = 25
const page = ref(0)

function buildQuery() {
  const p = new URLSearchParams()
  if (typeFilter.value) p.set('type', typeFilter.value)
  if (branchFilter.value) p.set('branchId', branchFilter.value)
  p.set('skip', String(page.value * take))
  p.set('take', String(take))
  return `?${p.toString()}`
}

watch([typeFilter, branchFilter], () => {
  page.value = 0
})

const { data, pending, refresh } = await useAsyncData<TxnPage>(
  () => `txns-${merchant.activeBranchId}-${typeFilter.value}-${branchFilter.value}-${page.value}`,
  () => api.get<TxnPage>(`/merchant/transactions${buildQuery()}`),
  {
    watch: [() => merchant.activeBranchId, typeFilter, branchFilter, page],
    default: () => ({ total: 0, rows: [] }),
  },
)

const hasPrev = computed(() => page.value > 0)
const hasNext = computed(() => (page.value + 1) * take < (data.value?.total ?? 0))

const signed = (t: Txn) => `${t.direction === 'DEBIT' ? '−' : '+'}${peso(t.amount)}`

const typeClass = (type: string) => {
  const map: Record<string, string> = {
    SALE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    REFUND: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    PURCHASE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    PAYOUT: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    ADJUSTMENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    FEE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
  return map[type] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

const columns: Column<Txn>[] = [
  { key: 'type', label: 'Type' },
  { key: 'direction', label: 'Direction' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'note', label: 'Note' },
  { key: 'createdAt', label: 'Date' },
]
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Transactions</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Ledger of money in &amp; out</p>
      </div>
      <Button variant="secondary" size="sm" :loading="pending" @click="refresh">Refresh</Button>
    </header>

    <!-- Filters -->
    <div v-if="merchant.can('transactions:view')" class="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label class="label-base" for="type">Type</label>
        <select id="type" v-model="typeFilter" class="input-base w-48">
          <option value="">All types</option>
          <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div v-if="merchant.isMain">
        <label class="label-base" for="branch">Branch</label>
        <select id="branch" v-model="branchFilter" class="input-base w-56">
          <option value="">All branches</option>
          <option v-for="b in merchant.branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
    </div>

    <DataTable :columns="columns" :rows="data?.rows || []" :loading="pending" empty="No transactions found.">
      <template #cell-type="{ row }">
        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" :class="typeClass(row.type)">
          {{ row.type }}
        </span>
      </template>
      <template #cell-direction="{ row }">
        <span :class="row.direction === 'CREDIT' ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-red-600 dark:text-red-400'">
          {{ row.direction }}
        </span>
      </template>
      <template #cell-amount="{ row }">
        <span :class="row.direction === 'CREDIT' ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-red-600 dark:text-red-400'">
          {{ signed(row) }}
        </span>
      </template>
      <template #cell-note="{ row }">{{ row.note || '—' }}</template>
      <template #cell-createdAt="{ row }">{{ date(row.createdAt) }}</template>
    </DataTable>

    <div v-if="data && data.total > take" class="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>{{ data.total }} total</span>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" :disabled="!hasPrev" @click="page--">Prev</Button>
        <Button variant="ghost" size="sm" :disabled="!hasNext" @click="page++">Next</Button>
      </div>
    </div>
  </div>
</template>
