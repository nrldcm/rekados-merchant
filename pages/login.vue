<script setup lang="ts">
import { isValidEmail } from '~/utils/validation'

definePageMeta({ layout: 'default' })
useHead({ title: 'Merchant login — Rekados' })

const auth = useAuthStore()
const route = useRoute()

const email = ref('')
const password = ref('')

const errors = reactive<{ email?: string; password?: string }>({})
const formError = ref<string | null>(null)
const submitting = ref(false)

// Set when the backend returns 403 (email not verified) — enables resend link.
const unverified = ref(false)
const resendState = ref<'idle' | 'sending' | 'sent'>('idle')

// MFA second step (set when login returns a challenge).
const mfaChallenge = ref<{
  challengeToken: string
  method: string
  availableMethods: string[]
} | null>(null)
const mfaCode = ref('')
const mfaMethod = ref<'EMAIL' | 'SMS' | 'TOTP'>('EMAIL')
const switchingChannel = ref(false)
const channelNotice = ref<string | null>(null)

// Priority is the authenticator (2FA). Only after 3 failed codes do we offer an
// Email/SMS fallback — and once a channel is chosen the offer disappears so it
// can't be spammed to keep re-sending.
const mfaFailCount = ref(0)
const fallbackOffered = ref(false)
const fallbackChosen = ref(false)
const mfaLocked = ref(false)

// Email/SMS channels available as a fallback, excluding the active one.
const fallbackChannels = computed(() =>
  (mfaChallenge.value?.availableMethods ?? []).filter(
    (m) => (m === 'EMAIL' || m === 'SMS') && m !== mfaMethod.value,
  ),
)

/** Choose the Email/SMS fallback: send the code, switch, then lock the choice. */
async function chooseFallback(m: string) {
  if (!mfaChallenge.value || switchingChannel.value) return
  switchingChannel.value = true
  formError.value = null
  try {
    await auth.sendMfaChallenge(mfaChallenge.value.challengeToken, m)
    mfaMethod.value = m as 'EMAIL' | 'SMS'
    channelNotice.value = m === 'SMS' ? 'We sent a code to your phone.' : 'We sent a code to your email.'
    fallbackChosen.value = true // hide the option — no spamming a re-send/switch
    fallbackOffered.value = false
    mfaCode.value = ''
  } catch (err) {
    formError.value = (err as { message?: string })?.message || 'Could not send a code. Please try again.'
  } finally {
    switchingChannel.value = false
  }
}

// If the auth middleware redirected here due to a role mismatch.
const denied = computed(() => route.query.denied === '1')

const validate = () => {
  errors.email = isValidEmail(email.value) ? undefined : 'Enter a valid email address.'
  errors.password = password.value ? undefined : 'Enter your password.'
  return !errors.email && !errors.password
}

const handleSubmit = async () => {
  formError.value = null
  unverified.value = false
  if (!validate()) return

  submitting.value = true
  try {
    const result = await auth.login({ email: email.value.trim(), password: password.value })
    if (result.mfaRequired) {
      // Second factor required — reveal the code step instead of navigating.
      mfaChallenge.value = {
        challengeToken: result.challengeToken,
        method: result.method,
        availableMethods: result.availableMethods ?? ['EMAIL'],
      }
      // The backend pre-sent via a default (TOTP if set, else email).
      mfaMethod.value = (result.method as 'EMAIL' | 'SMS' | 'TOTP') ?? 'EMAIL'
      mfaFailCount.value = 0
      fallbackOffered.value = false
      fallbackChosen.value = false
      mfaLocked.value = false
      mfaCode.value = ''
      channelNotice.value =
        result.method === 'TOTP'
          ? 'Enter the current code from your authenticator app.'
          : 'We sent a code to your email.'
      return
    }
    useState<boolean>('lock:locked', () => false).value = false // clear any stale lock gate
    const raw = (route.query.redirect as string) || '/app'
    // Only allow internal, same-origin paths (reject //host and /\host).
    await navigateTo(/^\/(?![/\\])/.test(raw) ? raw : '/app')
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    if (status === 403) {
      // Backend convention: 403 on login == email not verified.
      unverified.value = true
      formError.value = 'Your email address has not been verified yet.'
    } else if (status === 401) {
      formError.value = 'Invalid email or password.'
    } else {
      formError.value = (err as { message?: string })?.message || 'Unable to sign in. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

const submitMfa = async () => {
  if (!mfaChallenge.value) return
  formError.value = null
  submitting.value = true
  try {
    await auth.completeMfa(mfaChallenge.value.challengeToken, mfaCode.value.trim())
    useState<boolean>('lock:locked', () => false).value = false // clear any stale lock gate
    const raw = (route.query.redirect as string) || '/app'
    // Only allow internal, same-origin paths (reject //host and /\host).
    await navigateTo(/^\/(?![/\\])/.test(raw) ? raw : '/app')
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    if (status === 403) {
      // Backend lockout — too many attempts. Stop offering fallbacks.
      mfaLocked.value = true
      fallbackOffered.value = false
      formError.value =
        (err as { message?: string })?.message ||
        'Too many incorrect codes. Please wait a few minutes and try again.'
    } else {
      mfaFailCount.value += 1
      formError.value = (err as { message?: string })?.message || 'Invalid verification code.'
      // After 3 failed codes, offer an Email/SMS fallback (once).
      if (mfaFailCount.value >= 3 && !fallbackChosen.value && fallbackChannels.value.length) {
        fallbackOffered.value = true
      }
    }
    mfaCode.value = ''
  } finally {
    submitting.value = false
  }
}

const resendVerification = async () => {
  resendState.value = 'sending'
  try {
    // Core contract: re-send the email verification OTP for this address.
    await auth.resendEmailOtp(email.value.trim())
    resendState.value = 'sent'
    // Send them to the OTP entry screen to finish verifying.
    await navigateTo({ path: '/verify-email', query: { email: email.value.trim() } })
  } catch {
    resendState.value = 'idle'
    formError.value = 'Could not resend the verification email. Try again shortly.'
  }
}
</script>

<template>
  <AuthCard title="Merchant login" subtitle="Access your Rekados partner dashboard.">
    <div
      v-if="denied"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
      role="alert"
    >
      That account isn’t a merchant account. Sign in with a Rekados merchant login.
    </div>

    <!-- MFA second step -->
    <form v-if="mfaChallenge" novalidate @submit.prevent="submitMfa">
      <div class="space-y-4">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
          {{ mfaMethod === 'TOTP' ? 'Two-factor authentication' : 'Verification code' }}
        </p>

        <p v-if="channelNotice" class="text-sm text-slate-600 dark:text-slate-300">
          {{ channelNotice }} You can also use a backup code.
        </p>

        <!-- Fallback offer: only after 3 failed codes, and it disappears once used. -->
        <div
          v-if="fallbackOffered && !fallbackChosen"
          class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-900/20"
        >
          <p class="mb-2 text-amber-800 dark:text-amber-300">
            Having trouble? Send the code to:
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="m in fallbackChannels"
              :key="m"
              type="button"
              :disabled="switchingChannel"
              class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-60 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300"
              @click="chooseFallback(m)"
            >
              {{ m === 'SMS' ? 'Text message (SMS)' : 'Email' }}
            </button>
          </div>
        </div>

        <TextField
          v-model="mfaCode"
          label="Verification code"
          name="mfaCode"
          autocomplete="one-time-code"
          placeholder="123456"
          :required="true"
        />
        <button
          v-if="mfaMethod !== 'TOTP'"
          type="button"
          class="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60 dark:text-brand-400"
          :disabled="switchingChannel"
          @click="chooseFallback(mfaMethod)"
        >
          {{ switchingChannel ? 'Sending…' : 'Resend code' }}
        </button>
        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
        </div>
        <Button type="submit" :loading="submitting" :block="true">Verify &amp; sign in</Button>
        <button
          type="button"
          class="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400"
          @click="mfaChallenge = null"
        >
          Back
        </button>
      </div>
    </form>

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
          :error="errors.email"
        />
        <PasswordField
          v-model="password"
          label="Password"
          name="password"
          autocomplete="current-password"
          :required="true"
          :error="errors.password"
        />

        <div class="flex justify-end">
          <NuxtLink to="/forgot-password" class="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Forgot password?
          </NuxtLink>
        </div>

        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
          <button
            v-if="unverified && resendState !== 'sent'"
            type="button"
            class="ml-1 font-medium underline disabled:opacity-60"
            :disabled="resendState === 'sending'"
            @click="resendVerification"
          >
            {{ resendState === 'sending' ? 'Sending…' : 'Resend verification email' }}
          </button>
          <span v-else-if="unverified && resendState === 'sent'" class="ml-1 font-medium">Verification email sent.</span>
        </div>

        <Button type="submit" :loading="submitting" :block="true">Sign in</Button>
      </div>
    </form>

    <template #footer>
      New to Rekados?
      <NuxtLink to="/register" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Apply to become a partner
      </NuxtLink>
    </template>
  </AuthCard>
</template>
