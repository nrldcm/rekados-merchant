<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Sales — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso, date } = useFormat()

interface Summary {
  range: { from: string | null; to: string | null }
  branchIds: string[]
  totals: { sales: string; refunds: string; purchases: string; net: string }
  orders: { status: string; count: number; total: string }[]
  lowStockItems: number
}
interface Txn {
  id: string
  type: string
  direction: 'CREDIT' | 'DEBIT'
  amount: string
  currency: string
  note: string | null
  createdAt: string
}
interface TxnPage {
  total: number
  rows: Txn[]
}

// ---- Filters ----
const branchFilter = ref('') // '' = all branches (no branchId)
const from = ref('')
const to = ref('')
const take = 20
const page = ref(0)

function buildQuery(extra: Record<string, string | number> = {}) {
  const p = new URLSearchParams()
  if (branchFilter.value) p.set('branchId', branchFilter.value)
  if (from.value) p.set('from', from.value)
  if (to.value) p.set('to', to.value)
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Reset paging whenever the filters change.
watch([branchFilter, from, to], () => {
  page.value = 0
})

const { data: summary, pending: summaryPending, refresh: refreshSummary } = await useAsyncData<Summary>(
  () => `sales-summary-${merchant.activeBranchId}-${branchFilter.value}-${from.value}-${to.value}`,
  () => api.get<Summary>(`/merchant/reports/summary${buildQuery()}`),
  {
    watch: [() => merchant.activeBranchId, branchFilter, from, to],
    default: () => ({
      range: { from: null, to: null },
      branchIds: [],
      totals: { sales: '0', refunds: '0', purchases: '0', net: '0' },
      orders: [],
      lowStockItems: 0,
    }),
  },
)

const { data: txns, pending: txnsPending, refresh: refreshTxns } = await useAsyncData<TxnPage>(
  () => `sales-txns-${merchant.activeBranchId}-${branchFilter.value}-${from.value}-${to.value}-${page.value}`,
  () => api.get<TxnPage>(`/merchant/transactions${buildQuery({ type: 'SALE', skip: page.value * take, take })}`),
  {
    watch: [() => merchant.activeBranchId, branchFilter, from, to, page],
    default: () => ({ total: 0, rows: [] }),
  },
)

function refreshAll() {
  refreshSummary()
  refreshTxns()
}

const hasPrev = computed(() => page.value > 0)
const hasNext = computed(() => (page.value + 1) * take < (txns.value?.total ?? 0))

const columns: Column<Txn>[] = [
  { key: 'createdAt', label: 'Date' },
  { key: 'note', label: 'Note' },
  { key: 'amount', label: 'Amount', align: 'right' },
]
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ branchFilter ? merchant.branches.find((b) => b.id === branchFilter)?.name : (merchant.isMain ? 'All branches' : merchant.activeBranch?.name) }} · revenue overview
        </p>
      </div>
      <Button variant="secondary" size="sm" :loading="summaryPending || txnsPending" @click="refreshAll">Refresh</Button>
    </header>

    <!-- Filters -->
    <div v-if="merchant.can('sales:view')" class="card mb-4 flex flex-wrap items-end gap-3 p-4">
      <div v-if="merchant.isMain">
        <label class="label-base" for="branch">Branch</label>
        <select id="branch" v-model="branchFilter" class="input-base w-56">
          <option value="">All branches</option>
          <option v-for="b in merchant.branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>
      <div>
        <label class="label-base" for="from">From</label>
        <input id="from" v-model="from" type="date" class="input-base w-44" />
      </div>
      <div>
        <label class="label-base" for="to">To</label>
        <input id="to" v-model="to" type="date" class="input-base w-44" />
      </div>
    </div>

    <!-- Tiles -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard label="Sales" :value="peso(summary?.totals.sales)" icon="₱" hint="Gross sales for range" />
      <StatCard
        label="Net"
        :value="peso(summary?.totals.net)"
        icon="📈"
        hint="Sales less refunds & purchases"
        :trend-up="Number(summary?.totals.net ?? 0) >= 0"
      />
    </div>

    <!-- SALE transactions -->
    <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sale transactions</h2>
    <DataTable :columns="columns" :rows="txns?.rows || []" :loading="txnsPending" empty="No sales in this range.">
      <template #cell-createdAt="{ row }">{{ date(row.createdAt) }}</template>
      <template #cell-note="{ row }">{{ row.note || '—' }}</template>
      <template #cell-amount="{ row }">
        <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ peso(row.amount) }}</span>
      </template>
    </DataTable>

    <div v-if="txns && txns.total > take" class="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
      <span>{{ txns.total }} total</span>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" :disabled="!hasPrev" @click="page--">Prev</Button>
        <Button variant="ghost" size="sm" :disabled="!hasNext" @click="page++">Next</Button>
      </div>
    </div>
  </div>
</template>
