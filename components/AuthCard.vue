<script setup lang="ts">
// Centered card shell for landing-adjacent auth pages.
const props = defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 px-4 py-12 dark:from-brand-950/30 dark:via-slate-950 dark:to-slate-950">
    <div class="w-full max-w-md">
      <NuxtLink to="/" class="mb-6 flex items-center justify-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">R</span>
        <span class="text-lg font-semibold text-slate-900 dark:text-slate-100">Rekados <span class="text-brand-600 dark:text-brand-400">Merchant</span></span>
      </NuxtLink>

      <div class="card p-6 sm:p-8">
        <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ props.title }}</h1>
        <p v-if="props.subtitle" class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ props.subtitle }}</p>

        <div class="mt-6">
          <slot />
        </div>
      </div>

      <div v-if="$slots.footer" class="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
