<script setup lang="ts">
import { evaluatePassword, passwordRules } from '~/utils/validation'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    name?: string
    autocomplete?: string
    required?: boolean
    disabled?: boolean
    error?: string | null
    /** Show the strength meter + rule checklist (use on register/reset). */
    showStrength?: boolean
  }>(),
  {
    label: 'Password',
    autocomplete: 'current-password',
    required: false,
    disabled: false,
    showStrength: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const uid = useId()
const inputId = computed(() => props.name || `password-${uid}`)
const errorId = computed(() => `${inputId.value}-error`)
const meterId = computed(() => `${inputId.value}-meter`)

const revealed = ref(false)

const strength = computed(() => evaluatePassword(props.modelValue))

const barColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-brand-600']
const barColor = computed(() => barColors[strength.value.score] ?? barColors[0])

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

    <div class="relative">
      <input
        :id="inputId"
        :name="props.name"
        :type="revealed ? 'text' : 'password'"
        :value="props.modelValue"
        :autocomplete="props.autocomplete"
        :required="props.required"
        :disabled="props.disabled"
        :aria-invalid="!!props.error"
        :aria-describedby="props.showStrength ? meterId : (props.error ? errorId : undefined)"
        class="input-base pr-12"
        :class="props.error ? 'border-red-500 focus:border-red-500' : ''"
        @input="onInput"
      >
      <button
        type="button"
        class="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        :aria-pressed="revealed"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        {{ revealed ? 'Hide' : 'Show' }}
      </button>
    </div>

    <div v-if="props.showStrength" :id="meterId" class="mt-2">
      <div class="flex gap-1" aria-hidden="true">
        <span
          v-for="i in 5"
          :key="i"
          class="h-1.5 flex-1 rounded-full transition-colors"
          :class="props.modelValue && i <= strength.passed ? barColor : 'bg-slate-200 dark:bg-slate-700'"
        />
      </div>
      <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Strength:
        <span class="font-medium">{{ props.modelValue ? strength.label : '—' }}</span>
      </p>

      <ul class="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        <li
          v-for="rule in passwordRules"
          :key="rule.id"
          class="flex items-center gap-1.5 text-xs"
          :class="
            strength.satisfiedRuleIds.includes(rule.id)
              ? 'text-brand-700 dark:text-brand-400'
              : 'text-slate-500 dark:text-slate-400'
          "
        >
          <span aria-hidden="true">{{ strength.satisfiedRuleIds.includes(rule.id) ? '✓' : '○' }}</span>
          {{ rule.label }}
        </li>
      </ul>
    </div>

    <FormError v-if="props.error" :message="props.error" :id="errorId" />
  </div>
</template>
