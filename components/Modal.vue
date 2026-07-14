<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
  }>(),
  {},
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const close = () => emit('update:modelValue', false)

const uid = useId()
const titleId = computed(() => `modal-title-${uid}`)

// Close on Escape.
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="props.modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close" />
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="props.title ? titleId : undefined"
          class="card relative z-10 w-full max-w-lg p-6"
        >
          <div v-if="props.title || $slots.header" class="mb-4">
            <slot name="header">
              <h2 :id="titleId" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {{ props.title }}
              </h2>
              <p v-if="props.description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ props.description }}
              </p>
            </slot>
          </div>

          <button
            type="button"
            class="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close dialog"
            @click="close"
          >
            <span aria-hidden="true" class="text-lg leading-none">&times;</span>
          </button>

          <div>
            <slot />
          </div>

          <div v-if="$slots.footer" class="mt-6 flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
