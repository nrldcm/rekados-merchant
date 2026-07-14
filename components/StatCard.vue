<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    trend?: string
    trendUp?: boolean
    icon?: string
  }>(),
  { trendUp: true },
)
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ props.label }}</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">{{ props.value }}</p>
      </div>
      <div
        v-if="props.icon"
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-lg dark:bg-brand-900/30"
        aria-hidden="true"
      >
        {{ props.icon }}
      </div>
    </div>
    <div class="mt-3 flex items-center gap-2">
      <span
        v-if="props.trend"
        class="text-xs font-medium"
        :class="props.trendUp ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'"
      >
        {{ props.trendUp ? '▲' : '▼' }} {{ props.trend }}
      </span>
      <span v-if="props.hint" class="text-xs text-slate-500 dark:text-slate-400">{{ props.hint }}</span>
    </div>
  </div>
</template>
