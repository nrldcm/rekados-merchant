<script setup lang="ts">
import { evaluatePassword } from '~/utils/validation'

definePageMeta({ layout: 'default' })
useHead({ title: 'Reset password — Rekados Merchant' })

const route = useRoute()
const api = useApi()

const token = computed(() => (route.query.token as string | undefined) || '')

const password = ref('')
const confirmPassword = ref('')
const errors = reactive<{ password?: string; confirm?: string }>({})
const formError = ref<string | null>(null)
const submitting = ref(false)
const done = ref(false)

const validate = () => {
  errors.password = evaluatePassword(password.value).isValid
    ? undefined
    : 'Password does not meet all requirements.'
  errors.confirm =
    confirmPassword.value === password.value && confirmPassword.value.length > 0
      ? undefined
      : 'Passwords do not match.'
  return !errors.password && !errors.confirm
}

const handleSubmit = async () => {
  formError.value = null
  if (!token.value) {
    formError.value = 'This reset link is missing its token. Request a new one.'
    return
  }
  if (!validate()) return

  submitting.value = true
  try {
    await api.post('/auth/reset-password', { token: token.value, password: password.value })
    done.value = true
  } catch (err: unknown) {
    formError.value =
      (err as { message?: string })?.message ||
      'This reset link is invalid or has expired. Request a new one.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard title="Set a new password" subtitle="Choose a strong password for your account.">
    <div
      v-if="done"
      class="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300"
    >
      <p class="font-medium">Password updated.</p>
      <p class="mt-1">You can now sign in with your new password.</p>
      <NuxtLink
        to="/login"
        class="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go to login
      </NuxtLink>
    </div>

    <form v-else novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <div
          v-if="!token"
          class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
          role="alert"
        >
          This link is missing its token. Please use the link from your reset email or
          <NuxtLink to="/forgot-password" class="font-medium underline">request a new one</NuxtLink>.
        </div>

        <PasswordField
          v-model="password"
          label="New password"
          name="password"
          autocomplete="new-password"
          :required="true"
          :show-strength="true"
          :error="errors.password"
        />
        <PasswordField
          v-model="confirmPassword"
          label="Confirm new password"
          name="confirmPassword"
          autocomplete="new-password"
          :required="true"
          :error="errors.confirm"
        />

        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
        </div>

        <Button type="submit" :loading="submitting" :block="true" :disabled="!token">
          Reset password
        </Button>
      </div>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Back to login
      </NuxtLink>
    </template>
  </AuthCard>
</template>
