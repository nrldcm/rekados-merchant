<script setup lang="ts">
// Root component. Layouts under /layouts handle chrome; pages pick via definePageMeta.
useHead({
  bodyAttrs: {
    class: 'min-h-screen',
  },
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
