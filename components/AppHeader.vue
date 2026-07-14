<script setup lang="ts">
const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const auth = useAuthStore()
const { scheme, toggle: toggleScheme } = useColorScheme()

const menuOpen = ref(false)

const displayName = computed(() => {
  const u = auth.user
  if (!u) return 'Merchant'
  return u.businessName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
})

const initials = computed(() => {
  const name = displayName.value
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const loggingOut = ref(false)
const handleLogout = async () => {
  loggingOut.value = true
  try {
    await auth.logout()
  } finally {
    loggingOut.value = false
    menuOpen.value = false
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6"
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        aria-label="Toggle navigation"
        @click="emit('toggle-sidebar')"
      >
        <span aria-hidden="true">☰</span>
      </button>
      <h1 class="text-sm font-medium text-slate-500 dark:text-slate-400">Merchant portal</h1>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        :aria-label="scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleScheme"
      >
        <span aria-hidden="true">{{ scheme === 'dark' ? '☀' : '☾' }}</span>
      </button>

      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          @click="menuOpen = !menuOpen"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            {{ initials }}
          </span>
          <span class="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
            {{ displayName }}
          </span>
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          role="menu"
        >
          <div class="border-b border-slate-100 px-4 py-2 dark:border-slate-800">
            <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ displayName }}</p>
            <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ auth.user?.email }}</p>
            <span
              class="mt-1 inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
            >
              {{ auth.user?.role || 'MERCHANT' }}
            </span>
          </div>
          <NuxtLink
            to="/app/settings"
            class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            role="menuitem"
            @click="menuOpen = false"
          >
            Account settings
          </NuxtLink>
          <button
            type="button"
            class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
            role="menuitem"
            :disabled="loggingOut"
            @click="handleLogout"
          >
            {{ loggingOut ? 'Signing out…' : 'Sign out' }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
