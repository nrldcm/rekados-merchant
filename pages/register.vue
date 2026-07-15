<script setup lang="ts">
import { evaluatePassword, isValidEmail, isNonEmpty, minLength } from '~/utils/validation'

definePageMeta({ layout: 'default' })
useHead({ title: 'Become a partner — Rekados Merchant' })

const auth = useAuthStore()

type Step = 'account' | 'otp' | 'done'
const step = ref<Step>('account')

const form = reactive({
  // Account fields — the ONLY fields sent to /auth/signup.
  email: '',
  password: '',
  confirmPassword: '',
  // Store-profile fields — collected for convenience but kept LOCAL only.
  // TODO(backend): merchant profile endpoint (not built yet) — persist these
  // once a POST /merchants (or similar) route exists.
  businessName: '',
  ownerName: '',
  phone: '',
  storeAddress: '',
})

const errors = reactive<Record<string, string | undefined>>({})
const formError = ref<string | null>(null)
const submitting = ref(false)

// OTP step state.
const otp = ref('')
const otpError = ref<string | null>(null)
const verifying = ref(false)
const resendState = ref<'idle' | 'sending' | 'sent'>('idle')

const validateAccount = () => {
  errors.email = isValidEmail(form.email) ? undefined : 'Enter a valid email address.'
  errors.password = evaluatePassword(form.password).isValid
    ? undefined
    : 'Password does not meet all requirements.'
  errors.confirmPassword =
    form.confirmPassword === form.password && form.confirmPassword.length > 0
      ? undefined
      : 'Passwords do not match.'
  // Store-profile fields are optional at signup; validate only if provided so
  // we don't block account creation on data the backend can't store yet.
  errors.businessName = !form.businessName || isNonEmpty(form.businessName) ? undefined : 'Business name is required.'
  errors.ownerName = !form.ownerName || isNonEmpty(form.ownerName) ? undefined : 'Owner name is required.'
  // Normalize any provided number to canonical +639XXXXXXXXX.
  if (form.phone) {
    const formattedPhone = formatPhMobile(form.phone)
    if (formattedPhone) {
      form.phone = formattedPhone
      errors.phone = undefined
    } else {
      errors.phone = 'Enter a valid PH mobile number (e.g. 09171234567).'
    }
  } else {
    errors.phone = undefined
  }
  errors.storeAddress = !form.storeAddress || minLength(form.storeAddress, 6) ? undefined : 'Enter your store address.'

  return !errors.email && !errors.password && !errors.confirmPassword
}

/**
 * Persist the locally-collected store profile so it can be submitted once the
 * backend exposes an endpoint for it.
 * TODO(backend): merchant profile endpoint — replace this local stash with a
 * real API call (e.g. POST /merchants) after email verification / promotion.
 */
const stashStoreProfile = () => {
  if (!import.meta.client) return
  try {
    // sessionStorage (NOT localStorage): this PII is per-tab and auto-cleared
    // when the tab closes, instead of persisting indefinitely in JS-readable
    // storage. Replace with the real POST /merchants call once available.
    sessionStorage.setItem(
      'rekados.merchant.pendingProfile',
      JSON.stringify({
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        storeAddress: form.storeAddress.trim(),
      }),
    )
  } catch {
    // Non-fatal — the profile step is optional until the backend supports it.
  }
}

const handleAccountSubmit = async () => {
  formError.value = null
  if (!validateAccount()) return

  submitting.value = true
  try {
    await auth.signup(form.email.trim(), form.password)
    stashStoreProfile()
    step.value = 'otp'
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    if (status === 409) {
      formError.value = 'An account with this email already exists. Try logging in instead.'
    } else {
      formError.value = (err as { message?: string })?.message || 'Sign-up failed. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

const handleVerify = async () => {
  otpError.value = null
  if (otp.value.length !== 6) {
    otpError.value = 'Enter the 6-digit code from your email.'
    return
  }
  verifying.value = true
  try {
    // Auto-logs in (sets cookies) and populates the auth store.
    await auth.verifyEmail(form.email.trim(), otp.value)
    step.value = 'done'
    await navigateTo('/app')
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    otpError.value =
      status === 400 || status === 401
        ? 'That code is invalid or has expired.'
        : (err as { message?: string })?.message || 'Verification failed. Please try again.'
  } finally {
    verifying.value = false
  }
}

const handleResend = async () => {
  resendState.value = 'sending'
  otpError.value = null
  try {
    await auth.resendEmailOtp(form.email.trim())
    resendState.value = 'sent'
  } catch {
    resendState.value = 'idle'
    otpError.value = 'Could not resend the code. Try again shortly.'
  }
}
</script>

<template>
  <!-- Step 2: email OTP -->
  <AuthCard
    v-if="step === 'otp' || step === 'done'"
    title="Verify your email"
    :subtitle="`Enter the 6-digit code we sent to ${form.email}.`"
  >
    <form novalidate @submit.prevent="handleVerify">
      <div class="space-y-4">
        <OtpInput
          v-model="otp"
          :length="6"
          label="Verification code"
          :error="otpError"
          @complete="handleVerify"
        />

        <Button type="submit" :loading="verifying" :block="true">Verify & continue</Button>

        <div class="text-center text-sm text-slate-500 dark:text-slate-400">
          Didn’t get a code?
          <button
            type="button"
            class="font-medium text-brand-600 underline hover:text-brand-700 disabled:opacity-60 dark:text-brand-400"
            :disabled="resendState === 'sending'"
            @click="handleResend"
          >
            {{ resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Code sent ✓' : 'Resend code' }}
          </button>
        </div>
      </div>
    </form>

    <template #footer>
      Entered the wrong email?
      <button type="button" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400" @click="step = 'account'">
        Go back
      </button>
    </template>
  </AuthCard>

  <!-- Step 1: account -->
  <AuthCard v-else title="Become a Rekados partner" subtitle="Create your account to get started.">
    <form novalidate @submit.prevent="handleAccountSubmit">
      <div class="space-y-4">
        <TextField
          v-model="form.email"
          label="Email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="you@store.com"
          :required="true"
          :error="errors.email"
        />
        <PasswordField
          v-model="form.password"
          label="Password"
          name="password"
          autocomplete="new-password"
          :required="true"
          :show-strength="true"
          :error="errors.password"
        />
        <PasswordField
          v-model="form.confirmPassword"
          label="Confirm password"
          name="confirmPassword"
          autocomplete="new-password"
          :required="true"
          :error="errors.confirmPassword"
        />

        <!-- Store profile — optional here; stored locally and submitted later. -->
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <p class="mb-3 text-xs font-medium text-slate-600 dark:text-slate-400">
            Store details (optional) — you can complete your store profile later.
          </p>
          <div class="space-y-4">
            <TextField
              v-model="form.businessName"
              label="Business / store name"
              name="businessName"
              autocomplete="organization"
              :error="errors.businessName"
            />
            <TextField
              v-model="form.ownerName"
              label="Owner / contact name"
              name="ownerName"
              autocomplete="name"
              :error="errors.ownerName"
            />
            <TextField
              v-model="form.phone"
              label="Phone"
              name="phone"
              type="tel"
              autocomplete="tel"
              placeholder="+63 900 000 0000"
              :error="errors.phone"
            />
            <TextField
              v-model="form.storeAddress"
              label="Store address"
              name="storeAddress"
              autocomplete="street-address"
              :error="errors.storeAddress"
            />
          </div>
        </div>

        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
        </div>

        <Button type="submit" :loading="submitting" :block="true">Create account</Button>

        <p class="text-center text-xs text-slate-500 dark:text-slate-400">
          By signing up you agree to Rekados’ partner terms. Your password must be at least 12 characters
          with mixed case, a number and a symbol.
        </p>
      </div>
    </form>

    <template #footer>
      Already a partner?
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Log in
      </NuxtLink>
    </template>
  </AuthCard>
</template>
