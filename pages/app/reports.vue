<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Reports — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso } = useFormat()

interface OrderRow {
  status: string
  count: number
  total: string
}
interface Summary {
  range: { from: string | null; to: string | null }
  branchIds: string[]
  totals: { sales: string; refunds: string; purchases: string; net: string }
  orders: OrderRow[]
  lowStockItems: number
}

// ---- Filters ----
const branchFilter = ref('') // '' = all branches (no branchId)
const from = ref('')
const to = ref('')

function buildQuery() {
  const p = new URLSearchParams()
  if (branchFilter.value) p.set('branchId', branchFilter.value)
  if (from.value) p.set('from', from.value)
  if (to.value) p.set('to', to.value)
  const s = p.toString()
  return s ? `?${s}` : ''
}

const { data: summary, pending, refresh } = await useAsyncData<Summary>(
  () => `reports-summary-${merchant.activeBranchId}-${branchFilter.value}-${from.value}-${to.value}`,
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

function exportJson() {
  if (!merchant.can('reports:export') || !summary.value) return
  const blob = new Blob([JSON.stringify(summary.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rekados-report-${from.value || 'all'}-to-${to.value || 'all'}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const orderColumns: Column<OrderRow>[] = [
  { key: 'status', label: 'Status' },
  { key: 'count', label: 'Orders', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
]
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Summary across sales, refunds &amp; purchases</p>
      </div>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" :loading="pending" @click="refresh">Refresh</Button>
        <Button v-if="merchant.can('reports:export')" size="sm" :disabled="pending" @click="exportJson">Export</Button>
      </div>
    </header>

    <!-- Filters -->
    <div v-if="merchant.can('reports:view')" class="card mb-4 flex flex-wrap items-end gap-3 p-4">
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
    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard label="Sales" :value="peso(summary?.totals.sales)" icon="₱" />
      <StatCard label="Refunds" :value="peso(summary?.totals.refunds)" icon="↩" />
      <StatCard label="Purchases" :value="peso(summary?.totals.purchases)" icon="🛒" />
      <StatCard
        label="Net"
        :value="peso(summary?.totals.net)"
        icon="📈"
        :trend-up="Number(summary?.totals.net ?? 0) >= 0"
      />
      <StatCard label="Low stock items" :value="summary?.lowStockItems ?? 0" icon="⚠️" hint="At or below reorder level" />
    </div>

    <!-- Orders by status -->
    <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Orders by status</h2>
    <DataTable :columns="orderColumns" :rows="summary?.orders || []" :loading="pending" :row-key="'status'" empty="No orders in this range.">
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-total="{ row }">{{ peso(row.total) }}</template>
    </DataTable>
  </div>
</template>
