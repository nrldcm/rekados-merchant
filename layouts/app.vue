<script setup lang="ts">
// Authenticated merchant shell: sidebar + header + content.
const { init } = useColorScheme()
onMounted(init)

const sidebarOpen = ref(false)
const merchant = useMerchantStore()
const activeBranch = computed(() => merchant.activeBranch)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <LockOverlay />
    <div class="flex min-h-screen">
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
        <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-7xl">
            <div
              v-if="activeBranch && activeBranch.status === 'PENDING_KYC'"
              class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
              role="status"
            >
              <p class="font-medium">This branch isn’t verified yet.</p>
              <p class="mt-1">
                Submit your business documents (BIR / DTI / permits) under
                <NuxtLink to="/app/kyc" class="font-semibold underline">KYC</NuxtLink>
                to activate this branch and start accepting orders.
              </p>
            </div>
            <div
              v-else-if="activeBranch && activeBranch.status === 'SUSPENDED'"
              class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
              role="status"
            >
              <p class="font-medium">This branch is suspended.</p>
              <p class="mt-1">Contact Rekados support to restore access.</p>
            </div>
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
