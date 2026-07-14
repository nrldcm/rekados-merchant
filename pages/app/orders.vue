<script setup lang="ts">
import type { Column } from '~/types/table'
import { ORDER_FLOW, ORDER_STATUS_LABEL, type Order, type OrderStatus } from '~/stores/orders'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Orders — Rekados Merchant' })

const orders = useOrdersStore()

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

// --- Filtering -------------------------------------------------------------
const statusFilter = ref<OrderStatus | 'ALL'>('ALL')
const filterOptions: { value: OrderStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...ORDER_FLOW.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] })),
]

const filteredOrders = computed(() => {
  const list = [...orders.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return statusFilter.value === 'ALL' ? list : list.filter((o) => o.status === statusFilter.value)
})

const columns: Column<Order>[] = [
  { key: 'reference', label: 'Order' },
  { key: 'customerName', label: 'Customer' },
  { key: 'createdAt', label: 'Placed' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' },
]

// --- Detail ----------------------------------------------------------------
const selectedId = ref<string | null>(null)
const selected = computed(() => (selectedId.value ? orders.getById(selectedId.value) : undefined))
const detailOpen = computed({
  get: () => !!selectedId.value,
  set: (v: boolean) => {
    if (!v) selectedId.value = null
  },
})

const nextLabel = (status: OrderStatus) => {
  const next = orders.nextStatus(status)
  return next ? `Mark ${ORDER_STATUS_LABEL[next]}` : null
}

const advance = (id: string) => orders.advance(id)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">Orders</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Incoming ingredient orders. Move each order through the fulfilment flow.
      </p>
    </div>

    <!-- Status filter -->
    <div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter orders by status">
      <button
        v-for="opt in filterOptions"
        :key="opt.value"
        type="button"
        role="tab"
        :aria-selected="statusFilter === opt.value"
        class="rounded-full px-3 py-1.5 text-sm font-medium transition"
        :class="
          statusFilter === opt.value
            ? 'bg-brand-600 text-white'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:bg-slate-800'
        "
        @click="statusFilter = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <DataTable :columns="columns" :rows="filteredOrders" empty="No orders in this view.">
      <template #cell-reference="{ row }">
        <button
          type="button"
          class="font-medium text-brand-600 hover:underline dark:text-brand-400"
          @click="selectedId = row.id"
        >
          {{ row.reference }}
        </button>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-slate-500 dark:text-slate-400">{{ formatDate(row.createdAt) }}</span>
      </template>
      <template #cell-total="{ row }">
        {{ currency(row.total) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :status="row.status" />
      </template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" @click="selectedId = row.id">View</Button>
          <Button
            v-if="nextLabel(row.status)"
            size="sm"
            @click="advance(row.id)"
          >
            {{ nextLabel(row.status) }}
          </Button>
        </div>
      </template>
    </DataTable>

    <p class="mt-4 text-xs text-slate-400">
      Mock local store. TODO(backend): GET /merchant/orders and PATCH /merchant/orders/:id/status.
    </p>

    <!-- Order detail -->
    <Modal v-model="detailOpen" :title="selected ? `Order ${selected.reference}` : 'Order'">
      <div v-if="selected" class="space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">Customer</p>
            <p class="font-medium text-slate-900 dark:text-slate-100">{{ selected.customerName }}</p>
          </div>
          <StatusBadge :status="selected.status" />
        </div>

        <div>
          <p class="text-sm text-slate-500 dark:text-slate-400">Placed</p>
          <p class="text-slate-900 dark:text-slate-100">{{ formatDate(selected.createdAt) }}</p>
        </div>

        <!-- Fulfilment progress -->
        <div>
          <p class="mb-2 text-sm text-slate-500 dark:text-slate-400">Fulfilment progress</p>
          <ol class="flex items-center">
            <li v-for="(step, i) in ORDER_FLOW" :key="step" class="flex flex-1 items-center last:flex-none">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                :class="
                  ORDER_FLOW.indexOf(selected.status) >= i
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                "
                :title="ORDER_STATUS_LABEL[step]"
              >
                {{ i + 1 }}
              </span>
              <span
                v-if="i < ORDER_FLOW.length - 1"
                class="mx-1 h-0.5 flex-1"
                :class="ORDER_FLOW.indexOf(selected.status) > i ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'"
              />
            </li>
          </ol>
        </div>

        <!-- Items -->
        <div>
          <p class="mb-2 text-sm text-slate-500 dark:text-slate-400">Items to pack</p>
          <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            <li v-for="(item, i) in selected.items" :key="i" class="flex items-center justify-between px-3 py-2 text-sm">
              <span class="text-slate-800 dark:text-slate-200">{{ item.name }}</span>
              <span class="font-medium text-slate-600 dark:text-slate-400">{{ item.quantity }} {{ item.unit }}</span>
            </li>
          </ul>
        </div>

        <div class="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
          <span class="text-sm text-slate-500 dark:text-slate-400">Order total</span>
          <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ currency(selected.total) }}</span>
        </div>
      </div>

      <template #footer>
        <Button variant="secondary" @click="selectedId = null">Close</Button>
        <Button
          v-if="selected && nextLabel(selected.status)"
          @click="advance(selected.id)"
        >
          {{ nextLabel(selected.status) }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
