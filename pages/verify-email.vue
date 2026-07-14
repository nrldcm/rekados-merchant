<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Verify email — Rekados Merchant' })

const route = useRoute()
const api = useApi()

type State = 'verifying' | 'success' | 'error' | 'missing'
const state = ref<State>('verifying')
const message = ref('')

// Resend support if verification fails/expires.
const resendEmail = ref('')
const resendState = ref<'idle' | 'sending' | 'sent'>('idle')

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    state.value = 'missing'
    return
  }
  try {
    // Backend contract: verify the emailed token.
    // TODO(backend): confirm the exact route — using POST /auth/verify-email { token }.
    await api.post('/auth/verify-email', { token })
    state.value = 'success'
  } catch (err: unknown) {
    state.value = 'error'
    message.value =
      (err as { message?: string })?.message ||
      'This verification link is invalid or has expired.'
  }
})

const resend = async () => {
  if (!resendEmail.value) return
  resendState.value = 'sending'
  try {
    await api.post('/otp/request', {
      channel: 'EMAIL',
      purpose: 'EMAIL_VERIFICATION',
      email: resendEmail.value.trim(),
    })
    resendState.value = 'sent'
  } catch {
    resendState.value = 'idle'
  }
}
</script>

<template>
  <AuthCard title="Email verification">
    <div v-if="state === 'verifying'" class="flex flex-col items-center py-6 text-center">
      <svg class="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p class="mt-4 text-sm text-slate-600 dark:text-slate-400">Verifying your email address…</p>
    </div>

    <div v-else-if="state === 'success'" class="text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-900/40">✓</div>
      <p class="mt-4 font-medium text-slate-900 dark:text-slate-100">Your email is verified!</p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">You can now sign in to your merchant dashboard.</p>
      <NuxtLink
        to="/login"
        class="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Continue to login
      </NuxtLink>
    </div>

    <div v-else class="text-center">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-900/40">!</div>
      <p class="mt-4 font-medium text-slate-900 dark:text-slate-100">
        {{ state === 'missing' ? 'No verification token found' : 'Verification failed' }}
      </p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {{ state === 'missing' ? 'This link is missing its token. Use the link from your email.' : message }}
      </p>

      <div class="mt-6 space-y-3 text-left">
        <TextField
          v-model="resendEmail"
          label="Resend verification email"
          name="resendEmail"
          type="email"
          placeholder="you@store.com"
        />
        <Button :loading="resendState === 'sending'" :block="true" @click="resend">
          {{ resendState === 'sent' ? 'Email sent ✓' : 'Resend verification email' }}
        </Button>
      </div>
    </div>

    <template #footer>
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Back to login
      </NuxtLink>
    </template>
  </AuthCard>
</template>
