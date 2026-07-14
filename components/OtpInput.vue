<script setup lang="ts">
/**
 * OtpInput — a fixed-length numeric one-time-code entry.
 * v-model is the assembled string (e.g. "123456").
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    length?: number
    label?: string
    disabled?: boolean
    error?: string | null
  }>(),
  {
    length: 6,
    disabled: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; complete: [value: string] }>()

const uid = useId()
const inputs = ref<HTMLInputElement[]>([])

const digits = computed<string[]>(() => {
  const chars = props.modelValue.slice(0, props.length).split('')
  return Array.from({ length: props.length }, (_, i) => chars[i] ?? '')
})

const setDigits = (arr: string[]) => {
  const next = arr.join('').replace(/\D/g, '').slice(0, props.length)
  emit('update:modelValue', next)
  if (next.length === props.length) emit('complete', next)
}

const onInput = (index: number, event: Event) => {
  const el = event.target as HTMLInputElement
  const raw = el.value.replace(/\D/g, '')
  const arr = [...digits.value]
  if (raw.length > 1) {
    // Handles paste / fast typing landing in one box.
    const chars = raw.split('')
    for (let i = 0; i < chars.length && index + i < props.length; i++) {
      arr[index + i] = chars[i]
    }
    setDigits(arr)
    const nextFocus = Math.min(index + raw.length, props.length - 1)
    inputs.value[nextFocus]?.focus()
    return
  }
  arr[index] = raw
  setDigits(arr)
  if (raw && index < props.length - 1) inputs.value[index + 1]?.focus()
}

const onKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowLeft' && index > 0) {
    inputs.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < props.length - 1) {
    inputs.value[index + 1]?.focus()
  }
}

const onPaste = (index: number, event: ClipboardEvent) => {
  event.preventDefault()
  const text = (event.clipboardData?.getData('text') || '').replace(/\D/g, '')
  if (!text) return
  const arr = [...digits.value]
  const chars = text.split('')
  for (let i = 0; i < chars.length && index + i < props.length; i++) {
    arr[index + i] = chars[i]
  }
  setDigits(arr)
  const nextFocus = Math.min(index + text.length, props.length - 1)
  inputs.value[nextFocus]?.focus()
}
</script>

<template>
  <div>
    <label v-if="props.label" class="label-base">{{ props.label }}</label>
    <div class="flex gap-2" role="group" :aria-label="props.label || 'One-time code'">
      <input
        v-for="(digit, i) in digits"
        :key="`${uid}-${i}`"
        :ref="(el) => { if (el) inputs[i] = el as HTMLInputElement }"
        :value="digit"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="1"
        :disabled="props.disabled"
        :aria-invalid="!!props.error"
        class="h-12 w-10 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:w-12"
        :class="props.error ? 'border-red-500 focus:border-red-500' : ''"
        @input="onInput(i, $event)"
        @keydown="onKeydown(i, $event)"
        @paste="onPaste(i, $event)"
      >
    </div>
    <FormError v-if="props.error" :message="props.error" />
  </div>
</template>
