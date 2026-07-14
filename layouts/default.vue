<script setup lang="ts">
// Public layout for landing + auth pages. Initializes color scheme on mount.
const { init } = useColorScheme()
onMounted(init)
</script>

<template>
  <div class="min-h-screen">
    <slot />
  </div>
</template>
