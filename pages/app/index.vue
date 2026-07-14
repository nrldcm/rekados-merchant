<script setup lang="ts">
import type { Column } from '~/types/table'
import type { Order } from '~/stores/orders'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Dashboard — Rekados Merchant' })

const auth = useAuthStore()
const orders = useOrdersStore()
const catalog = useCatalogStore()

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const greetingName = computed(
  () => auth.user?.businessName || auth.user?.firstName || 'there',
)

// Recent orders preview (latest 5).
const recentOrders = computed(() =>
  [...orders.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
)

const columns: Column<Order>[] = [
  { key: 'reference', label: 'Order' },
  { key: 'customerName', label: 'Customer' },
  { key: 'items', label: 'Items', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status' },
]
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">Welcome back, {{ greetingName }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Here’s what’s happening in your store today.</p>
    </div>

    <!-- KPIs (mock data — see stores/orders.ts + stores/catalog.ts) -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Open orders" :value="orders.openOrders.length" icon="✽" hint="Awaiting fulfilment" />
      <StatCard label="Items to pack" :value="orders.itemsToPack" icon="📦" hint="Across new & accepted" />
      <StatCard label="Revenue today" :value="currency(orders.revenueToday)" icon="💵" trend="mock" />
      <StatCard label="Low stock" :value="catalog.lowStockCount" icon="⚠" hint="≤ 20 units" :trend-up="false" />
    </div>

    <!-- Recent orders -->
    <div class="mt-8">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent orders</h2>
        <NuxtLink to="/app/orders" class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          View all
        </NuxtLink>
      </div>

      <DataTable :columns="columns" :rows="recentOrders" empty="No orders yet.">
        <template #cell-reference="{ row }">
          <span class="font-medium text-slate-900 dark:text-slate-100">{{ row.reference }}</span>
        </template>
        <template #cell-items="{ row }">
          {{ row.items.length }}
        </template>
        <template #cell-total="{ row }">
          {{ currency(row.total) }}
        </template>
        <template #cell-status="{ row }">
          <StatusBadge :status="row.status" />
        </template>
      </DataTable>
    </div>

    <p class="mt-4 text-xs text-slate-400">
      Figures shown are mock data for scaffolding. TODO(backend): replace with GET /merchant/dashboard.
    </p>
  </div>
</template>
