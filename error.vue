<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const handleClear = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
    <div class="card w-full max-w-md p-8 text-center">
      <p class="text-5xl font-bold text-brand-600 dark:text-brand-400">
        {{ props.error?.statusCode || 500 }}
      </p>
      <h1 class="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
        Something went wrong
      </h1>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {{ props.error?.statusMessage || 'An unexpected error occurred.' }}
      </p>
      <button
        class="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        @click="handleClear"
      >
        Back to home
      </button>
    </div>
  </div>
</template>
