<script setup lang="ts">
// Authenticated merchant shell: sidebar + header + content.
const { init } = useColorScheme()
onMounted(init)

const sidebarOpen = ref(false)

// A fresh self-signup is role USER until an admin promotes it to MERCHANT.
const auth = useAuthStore()
const { isPendingApproval } = storeToRefs(auth)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div class="flex min-h-screen">
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
        <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-7xl">
            <div
              v-if="isPendingApproval"
              class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
              role="status"
            >
              <p class="font-medium">Your merchant account is pending approval.</p>
              <p class="mt-1">
                You’re signed in, but a Rekados admin still needs to activate your merchant access.
                Some actions may be unavailable until then.
              </p>
            </div>
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
