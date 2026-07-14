<script setup lang="ts">
import type { OrderStatus } from '~/stores/orders'
import { ORDER_STATUS_LABEL } from '~/stores/orders'

const props = defineProps<{ status: OrderStatus }>()

const styles: Record<OrderStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ACCEPTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PACKED: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  READY_FOR_PICKUP: 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300',
}

const label = computed(() => ORDER_STATUS_LABEL[props.status] ?? props.status)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="styles[props.status]"
  >
    {{ label }}
  </span>
</template>
