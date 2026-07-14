<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Dashboard — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso } = useFormat()

interface ReportSummary {
  totals: { sales: number; refunds: number; purchases: number; net: number }
  orders: { status: string; count: number; total: number }[]
  lowStockItems: number
}

// Report is gated by reports:view; fall back gracefully if not permitted.
const { data: report, pending } = await useAsyncData<ReportSummary | null>(
  () => `dashboard-${merchant.activeBranchId}`,
  async () => {
    if (!merchant.can('reports:view')) return null
    try {
      return await api.get<ReportSummary>('/merchant/reports/summary')
    } catch {
      return null
    }
  },
  { watch: [() => merchant.activeBranchId] },
)

const orderCount = computed(
  () => report.value?.orders.reduce((s, o) => s + o.count, 0) ?? 0,
)
</script>

<template>
  <div>
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ merchant.activeBranch?.name }} ·
        {{ merchant.isMain ? 'Main branch — overall + per sub-branch' : 'Sub-branch view' }}
      </p>
    </header>

    <div v-if="report" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Sales" :value="peso(report.totals.sales)" />
      <StatCard label="Refunds" :value="peso(report.totals.refunds)" />
      <StatCard label="Net" :value="peso(report.totals.net)" />
      <StatCard label="Low-stock items" :value="String(report.lowStockItems)" />
    </div>
    <p v-else-if="pending" class="text-sm text-slate-500">Loading…</p>
    <div
      v-else
      class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
    >
      No dashboard metrics available for your role.
    </div>

    <div v-if="report" class="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Orders by status ({{ orderCount }} total)
      </h2>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="o in report.orders"
          :key="o.status"
          class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {{ o.status }}: {{ o.count }}
        </span>
        <span v-if="!report.orders.length" class="text-sm text-slate-400">No orders yet.</span>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <NuxtLink v-if="merchant.can('catalog:view')" to="/app/catalog" class="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">🍳 Rekados</NuxtLink>
      <NuxtLink v-if="merchant.can('inventory:view')" to="/app/inventory" class="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">▦ Inventory</NuxtLink>
      <NuxtLink v-if="merchant.can('orders:view')" to="/app/orders" class="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">✽ Orders</NuxtLink>
      <NuxtLink to="/app/settings" class="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">⚙ Settings</NuxtLink>
    </div>
  </div>
</template>
