<script setup lang="ts">
const props = withDefaults(defineProps<{ open?: boolean }>(), { open: false })
const emit = defineEmits<{ close: [] }>()

const merchant = useMerchantStore()

interface NavItem {
  to: string
  label: string
  icon: string
  perms: string[]
  mainOnly?: boolean
  exact?: boolean
}

// Every item is RBAC-gated: shown only when the active-branch role holds any of
// `perms`. `mainOnly` items (branch management) hide on a sub-branch context.
const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: '▤', perms: ['dashboard:view'], exact: true },
  { to: '/app/orders', label: 'Orders', icon: '✽', perms: ['orders:view'] },
  { to: '/app/inventory', label: 'Inventory', icon: '▦', perms: ['inventory:view'] },
  { to: '/app/catalog', label: 'Rekados', icon: '🍳', perms: ['catalog:view'] },
  { to: '/app/settings', label: 'Settings', icon: '⚙', perms: [] },
]

const items = computed(() =>
  NAV.filter((n) => {
    if (n.mainOnly && !merchant.isMain) return false
    if (n.perms.length === 0) return true
    return merchant.canAny(...n.perms)
  }),
)
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
    @click="emit('close')"
  />

  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0"
    :class="props.open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">R</span>
      <div class="leading-tight">
        <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Rekados</p>
        <p class="text-xs text-brand-600 dark:text-brand-400">Merchant</p>
      </div>
    </div>

    <BranchSwitcher class="border-b border-slate-200 dark:border-slate-800" />

    <nav class="flex-1 overflow-y-auto p-3" aria-label="Primary">
      <ul class="space-y-1">
        <li v-for="item in items" :key="item.to">
          <NuxtLink
            :to="item.to"
            :exact-active-class="item.exact ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : ''"
            :active-class="item.exact ? '' : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="emit('close')"
          >
            <span class="w-5 text-center text-base" aria-hidden="true">{{ item.icon }}</span>
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="border-t border-slate-200 p-4 text-xs text-slate-400 dark:border-slate-800">
      <p class="font-medium text-slate-500 dark:text-slate-400">{{ merchant.roleName || 'Merchant' }}</p>
      <p>{{ merchant.merchant?.tradeName || merchant.merchant?.legalName || 'Partner portal' }}</p>
    </div>
  </aside>
</template>
