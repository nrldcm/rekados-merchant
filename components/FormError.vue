<script setup lang="ts">
const props = defineProps<{ message?: string | null }>()
</script>

<template>
  <p
    v-if="props.message"
    class="mt-1 text-sm text-red-600 dark:text-red-400"
    role="alert"
  >
    {{ props.message }}
  </p>
</template>
