<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    type?: string
    name?: string
    placeholder?: string
    autocomplete?: string
    required?: boolean
    disabled?: boolean
    error?: string | null
    hint?: string
  }>(),
  {
    type: 'text',
    required: false,
    disabled: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uid = useId()
const inputId = computed(() => props.name || `field-${uid}`)
const errorId = computed(() => `${inputId.value}-error`)
const hintId = computed(() => `${inputId.value}-hint`)

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.hint) ids.push(hintId.value)
  if (props.error) ids.push(errorId.value)
  return ids.length ? ids.join(' ') : undefined
})

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div>
    <label v-if="props.label" :for="inputId" class="label-base">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500" aria-hidden="true">*</span>
    </label>

    <input
      :id="inputId"
      :name="props.name"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :autocomplete="props.autocomplete"
      :required="props.required"
      :disabled="props.disabled"
      :aria-invalid="!!props.error"
      :aria-describedby="describedBy"
      class="input-base"
      :class="props.error ? 'border-red-500 focus:border-red-500' : ''"
      @input="onInput"
    >

    <p v-if="props.hint && !props.error" :id="hintId" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
      {{ props.hint }}
    </p>
    <FormError v-if="props.error" :message="props.error" :id="errorId" />
  </div>
</template>
