<script setup lang="ts">
// Authenticated merchant shell: sidebar + header + content.
const { init } = useColorScheme()
onMounted(init)

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div class="flex min-h-screen">
      <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <div class="flex min-w-0 flex-1 flex-col">
        <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />
        <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-7xl">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
