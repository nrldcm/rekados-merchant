<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Orders — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso, date } = useFormat()

interface OrderRow {
  id: string
  orderNumber: string
  status: string
  subtotal: string
  total: string
  placedAt: string
  branch?: { name: string }
  items: { nameSnapshot: string; quantity: number; lineTotal: string }[]
}

const statusFilter = ref('')
const { data, pending, refresh } = await useAsyncData<{ total: number; rows: OrderRow[] }>(
  () => `orders-${merchant.activeBranchId}-${statusFilter.value}`,
  () => api.get<{ total: number; rows: OrderRow[] }>(`/merchant/orders${statusFilter.value ? `?status=${statusFilter.value}` : ''}`),
  { watch: [() => merchant.activeBranchId, statusFilter], default: () => ({ total: 0, rows: [] }) },
)

const NEXT: Record<string, { action: string; label: string }> = {
  PENDING_PAYMENT: { action: 'confirm', label: 'Confirm' },
  CONFIRMED: { action: 'prepare', label: 'Prepare' },
  PREPARING: { action: 'ready', label: 'Mark ready' },
  READY: { action: 'dispatch', label: 'Dispatch' },
  OUT_FOR_DELIVERY: { action: 'deliver', label: 'Delivered' },
}

const columns: Column<OrderRow>[] = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'items', label: 'Items', align: 'right' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', align: 'right' },
]

const busy = ref<string | null>(null)
const error = ref<string | null>(null)

async function advance(o: OrderRow) {
  const next = NEXT[o.status]
  if (!next) return
  busy.value = o.id
  error.value = null
  try {
    await api.post(`/merchant/orders/${o.id}/transition`, { action: next.action })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not update order.'
  } finally {
    busy.value = null
  }
}
async function cancel(o: OrderRow) {
  if (!confirm(`Cancel ${o.orderNumber}? Reserved stock is released.`)) return
  busy.value = o.id
  try {
    await api.post(`/merchant/orders/${o.id}/cancel`, { reason: 'Cancelled by staff' })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not cancel order.'
  } finally {
    busy.value = null
  }
}

// ---- POS create ----
interface ActiveRekados { id: string; name: string; availableKits: number; pricing: { basePrice: number } }
const showCreate = ref(false)
const activeRekados = ref<ActiveRekados[]>([])
const lines = ref<{ rekadosId: string; quantity: number }[]>([])
const creating = ref(false)

async function openCreate() {
  error.value = null
  const all = await api.get<ActiveRekados[]>('/merchant/catalog')
  activeRekados.value = (all as unknown as (ActiveRekados & { status: string })[]).filter((r) => r.status === 'ACTIVE')
  lines.value = activeRekados.value.length ? [{ rekadosId: activeRekados.value[0].id, quantity: 1 }] : []
  showCreate.value = true
}
async function submitCreate() {
  creating.value = true
  error.value = null
  try {
    await api.post('/merchant/orders', {
      idempotencyKey: `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      items: lines.value.filter((l) => l.rekadosId && l.quantity > 0),
    })
    showCreate.value = false
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not place order (check stock).'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Orders</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ merchant.isMain ? 'All branches' : merchant.activeBranch?.name }} · {{ data?.total ?? 0 }} orders
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="statusFilter" class="input-base w-40">
          <option value="">All statuses</option>
          <option>PENDING_PAYMENT</option>
          <option>CONFIRMED</option>
          <option>PREPARING</option>
          <option>READY</option>
          <option>OUT_FOR_DELIVERY</option>
          <option>DELIVERED</option>
          <option>CANCELLED</option>
          <option>REFUNDED</option>
        </select>
        <Button v-if="merchant.can('orders:create')" @click="openCreate">+ New order</Button>
      </div>
    </header>

    <FormError v-if="error" :message="error" class="mb-3" />

    <DataTable :columns="columns" :rows="data?.rows || []" :loading="pending" empty="No orders yet.">
      <template #cell-orderNumber="{ row }">
        <div class="font-medium text-slate-900 dark:text-slate-100">{{ row.orderNumber }}</div>
        <div class="text-xs text-slate-400">{{ date(row.placedAt) }}<span v-if="row.branch"> · {{ row.branch.name }}</span></div>
      </template>
      <template #cell-items="{ row }">{{ row.items.reduce((s, i) => s + i.quantity, 0) }}</template>
      <template #cell-total="{ row }">{{ peso(row.total) }}</template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1.5">
          <button
            v-if="NEXT[row.status] && merchant.can('orders:update')"
            class="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            :disabled="busy === row.id"
            @click="advance(row)"
          >{{ NEXT[row.status].label }}</button>
          <button
            v-if="NEXT[row.status] && merchant.can('orders:cancel')"
            class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/30"
            :disabled="busy === row.id"
            @click="cancel(row)"
          >Cancel</button>
        </div>
      </template>
    </DataTable>

    <Modal v-model="showCreate" title="New order (POS)">
      <div class="space-y-3">
        <p v-if="!activeRekados.length" class="text-sm text-slate-500">No active rekados to sell. Activate a rekados first.</p>
        <div v-for="(line, idx) in lines" :key="idx" class="flex items-center gap-2">
          <select v-model="line.rekadosId" class="input-base flex-1">
            <option v-for="r in activeRekados" :key="r.id" :value="r.id">
              {{ r.name }} — {{ peso(r.pricing.basePrice) }} ({{ r.availableKits }} left)
            </option>
          </select>
          <input v-model.number="line.quantity" type="number" min="1" class="input-base w-20" />
          <button type="button" class="text-slate-400 hover:text-red-500" @click="lines.splice(idx, 1)">✕</button>
        </div>
        <button v-if="activeRekados.length" type="button" class="text-xs font-medium text-brand-600" @click="lines.push({ rekadosId: activeRekados[0].id, quantity: 1 })">+ Add line</button>
        <FormError v-if="error" :message="error" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showCreate = false">Cancel</Button>
        <Button :loading="creating" :disabled="!lines.length" @click="submitCreate">Place order</Button>
      </template>
    </Modal>
  </div>
</template>
