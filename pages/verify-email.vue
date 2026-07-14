<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Verify email — Rekados Merchant' })

const route = useRoute()
const auth = useAuthStore()

// Core verification is OTP-code based (POST /auth/verify-email {email, code}),
// so this screen collects the email + the 6-digit code from the email.
const email = ref((route.query.email as string) || '')
const code = ref('')

const formError = ref<string | null>(null)
const verifying = ref(false)
const resendState = ref<'idle' | 'sending' | 'sent'>('idle')

const handleVerify = async () => {
  formError.value = null
  if (!email.value.trim()) {
    formError.value = 'Enter the email address you signed up with.'
    return
  }
  if (code.value.length !== 6) {
    formError.value = 'Enter the 6-digit code from your email.'
    return
  }
  verifying.value = true
  try {
    // Auto-logs in (sets cookies) and populates the auth store.
    await auth.verifyEmail(email.value.trim(), code.value)
    await navigateTo('/app')
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    formError.value =
      status === 400 || status === 401
        ? 'That code is invalid or has expired.'
        : (err as { message?: string })?.message || 'Verification failed. Please try again.'
  } finally {
    verifying.value = false
  }
}

const resend = async () => {
  if (!email.value.trim()) {
    formError.value = 'Enter your email to resend the code.'
    return
  }
  resendState.value = 'sending'
  formError.value = null
  try {
    await auth.resendEmailOtp(email.value.trim())
    resendState.value = 'sent'
  } catch {
    resendState.value = 'idle'
    formError.value = 'Could not resend the code. Try again shortly.'
  }
}
</script>

<template>
  <AuthCard title="Verify your email" subtitle="Enter the 6-digit code we emailed you.">
    <form novalidate @submit.prevent="handleVerify">
      <div class="space-y-4">
        <TextField
          v-model="email"
          label="Email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="you@store.com"
          :required="true"
        />
        <OtpInput
          v-model="code"
          :length="6"
          label="Verification code"
          @complete="handleVerify"
        />

        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
        </div>

        <Button type="submit" :loading="verifying" :block="true">Verify & continue</Button>

        <div class="text-center text-sm text-slate-500 dark:text-slate-400">
          Didn’t get a code?
          <button
            type="button"
            class="font-medium text-brand-600 underline hover:text-brand-700 disabled:opacity-60 dark:text-brand-400"
            :disabled="resendState === 'sending'"
            @click="resend"
          >
            {{ resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Code sent ✓' : 'Resend code' }}
          </button>
        </div>
      </div>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Back to login
      </NuxtLink>
    </template>
  </AuthCard>
</template>
