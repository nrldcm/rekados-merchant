<script setup lang="ts">
import { isValidEmail } from '~/utils/validation'

definePageMeta({ layout: 'default' })
useHead({ title: 'Forgot password — Rekados Merchant' })

const api = useApi()

const email = ref('')
const emailError = ref<string | undefined>()
const submitting = ref(false)
const done = ref(false)

const handleSubmit = async () => {
  emailError.value = isValidEmail(email.value) ? undefined : 'Enter a valid email address.'
  if (emailError.value) return

  submitting.value = true
  try {
    await api.post('/auth/forgot-password', { email: email.value.trim() })
  } catch {
    // Intentionally ignore errors: never reveal whether an account exists.
  } finally {
    submitting.value = false
    // Always show the same confirmation to avoid account enumeration.
    done.value = true
  }
}
</script>

<template>
  <AuthCard title="Forgot your password?" subtitle="We’ll email you a reset link.">
    <div
      v-if="done"
      class="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300"
    >
      If an account exists for <span class="font-medium">{{ email }}</span>, a password reset link is on
      its way. Check your inbox and spam folder.
    </div>

    <form v-else novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <TextField
          v-model="email"
          label="Email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="you@store.com"
          :required="true"
          :error="emailError"
        />
        <Button type="submit" :loading="submitting" :block="true">Send reset link</Button>
      </div>
    </form>

    <template #footer>
      Remembered it?
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Back to login
      </NuxtLink>
    </template>
  </AuthCard>
</template>
