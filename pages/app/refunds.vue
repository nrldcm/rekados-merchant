<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Refunds — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso, date } = useFormat()

interface RefundRow {
  id: string
  orderId: string
  amount: string
  reason: string
  status: 'REQUESTED' | 'COMPLETED' | 'REJECTED'
  requestedByUserId: string
  approvedByUserId: string | null
  createdAt: string
  decidedAt: string | null
}

const { data: refunds, pending, refresh } = await useAsyncData<RefundRow[]>(
  () => `refunds-${merchant.activeBranchId}`,
  () => api.get<RefundRow[]>('/merchant/refunds'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

const columns: Column<RefundRow>[] = [
  { key: 'orderId', label: 'Order' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Requested' },
  { key: 'actions', label: '', align: 'right' },
]

const busy = ref<string | null>(null)
const error = ref<string | null>(null)

async function decide(row: RefundRow, approve: boolean) {
  busy.value = row.id
  error.value = null
  try {
    await api.post(`/merchant/refunds/${row.id}/approve`, { approve })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not update refund.'
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Refunds</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ merchant.activeBranch?.name }} · approval queue</p>
      </div>
    </header>

    <p class="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
      Maker-checker: a refund must be approved by a different user than the one who requested it. Approving may require
      step-up verification.
    </p>

    <FormError v-if="error" :message="error" class="mb-3" />

    <DataTable :columns="columns" :rows="refunds || []" :loading="pending" empty="No refund requests yet.">
      <template #cell-orderId="{ row }">
        <div class="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">{{ row.orderId.slice(0, 8) }}</div>
      </template>
      <template #cell-amount="{ row }">
        <span class="font-medium text-slate-900 dark:text-slate-100">{{ peso(row.amount) }}</span>
      </template>
      <template #cell-reason="{ row }">
        <span class="text-slate-700 dark:text-slate-300">{{ row.reason }}</span>
      </template>
      <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #cell-createdAt="{ row }">
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ date(row.createdAt) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div v-if="row.status === 'REQUESTED' && merchant.can('refunds:approve')" class="flex justify-end gap-1.5">
          <button
            class="rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            :disabled="busy === row.id"
            @click="decide(row, true)"
          >Approve</button>
          <button
            class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/30"
            :disabled="busy === row.id"
            @click="decide(row, false)"
          >Reject</button>
        </div>
      </template>
    </DataTable>
  </div>
</template>
