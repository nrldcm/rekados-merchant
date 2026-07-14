<script setup lang="ts">
const props = defineProps<{ status: string }>()

const styles: Record<string, string> = {
  PENDING_PAYMENT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  PREPARING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  READY: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  OUT_FOR_DELIVERY: 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300',
  DELIVERED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  REFUNDED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const label = computed(() =>
  props.status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' '),
)
const cls = computed(() => styles[props.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" :class="cls">
    {{ label }}
  </span>
</template>
