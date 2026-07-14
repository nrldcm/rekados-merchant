<script setup lang="ts">
/**
 * Branch context switcher. Changing the active branch updates the X-Branch-Id
 * cookie (read by useApi) and the RBAC permissions in play, then reloads the
 * current route's data by refreshing the page's scope.
 */
const merchant = useMerchantStore()
const open = ref(false)

const current = computed(() => merchant.activeBranch)
const others = computed(() =>
  merchant.branches.filter((b) => b.id !== merchant.activeBranchId),
)

async function pick(branchId: string) {
  open.value = false
  if (branchId === merchant.activeBranchId) return
  merchant.switchBranch(branchId)
  // Re-run data loads on the current page.
  await refreshNuxtData()
}
</script>

<template>
  <div v-if="merchant.branches.length" class="relative p-3">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm dark:border-slate-700 dark:bg-slate-800"
      @click="open = !open"
    >
      <span class="min-w-0">
        <span class="block truncate font-medium text-slate-900 dark:text-slate-100">
          {{ current?.name ?? 'Select branch' }}
        </span>
        <span class="block text-xs text-slate-500 dark:text-slate-400">
          {{ current?.type === 'MAIN' ? 'Main branch' : 'Sub-branch' }}
        </span>
      </span>
      <span class="text-slate-400" aria-hidden="true">▾</span>
    </button>

    <div
      v-if="open"
      class="absolute inset-x-3 z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <button
        v-for="b in others"
        :key="b.id"
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="pick(b.id)"
      >
        <span class="truncate text-slate-700 dark:text-slate-200">{{ b.name }}</span>
        <span class="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          {{ b.type === 'MAIN' ? 'Main' : 'Sub' }}
        </span>
      </button>
      <p v-if="!others.length" class="px-3 py-2 text-xs text-slate-400">No other branches</p>
    </div>
  </div>
</template>
