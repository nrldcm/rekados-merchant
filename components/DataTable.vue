<script setup lang="ts" generic="T extends Record<string, any>">
import type { Column } from '~/types/table'

const props = withDefaults(
  defineProps<{
    columns: Column<T>[]
    rows: T[]
    rowKey?: keyof T
    empty?: string
    loading?: boolean
  }>(),
  {
    rowKey: 'id' as never,
    empty: 'No records found.',
    loading: false,
  },
)

const alignClass = (align?: string) =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
</script>

<template>
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead class="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th
              v-for="col in props.columns"
              :key="col.key"
              scope="col"
              class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              :class="alignClass(col.align)"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <tr v-if="props.loading">
            <td :colspan="props.columns.length" class="px-4 py-10 text-center text-sm text-slate-500">
              Loading…
            </td>
          </tr>
          <tr v-else-if="props.rows.length === 0">
            <td :colspan="props.columns.length" class="px-4 py-10 text-center text-sm text-slate-500">
              {{ props.empty }}
            </td>
          </tr>
          <tr
            v-for="row in props.rows"
            v-else
            :key="String(row[props.rowKey])"
            class="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
          >
            <td
              v-for="col in props.columns"
              :key="col.key"
              class="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
              :class="alignClass(col.align)"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ col.format ? col.format(row) : row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
