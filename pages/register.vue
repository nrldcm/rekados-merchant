<script setup lang="ts">
import { evaluatePassword, isValidEmail, isValidPhone, isNonEmpty, minLength } from '~/utils/validation'

definePageMeta({ layout: 'default' })
useHead({ title: 'Become a partner — Rekados Merchant' })

const auth = useAuthStore()

const form = reactive({
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  storeAddress: '',
})

const errors = reactive<Record<string, string | undefined>>({})
const formError = ref<string | null>(null)
const submitting = ref(false)
const submitted = ref(false)

const validate = () => {
  errors.businessName = isNonEmpty(form.businessName) ? undefined : 'Business name is required.'
  errors.ownerName = isNonEmpty(form.ownerName) ? undefined : 'Owner name is required.'
  errors.email = isValidEmail(form.email) ? undefined : 'Enter a valid email address.'
  errors.phone = isValidPhone(form.phone) ? undefined : 'Enter a valid phone number.'
  errors.storeAddress = minLength(form.storeAddress, 6) ? undefined : 'Enter your store address.'
  errors.password = evaluatePassword(form.password).isValid
    ? undefined
    : 'Password does not meet all requirements.'
  errors.confirmPassword =
    form.confirmPassword === form.password && form.confirmPassword.length > 0
      ? undefined
      : 'Passwords do not match.'

  return Object.values(errors).every((e) => !e)
}

const handleSubmit = async () => {
  formError.value = null
  if (!validate()) return

  submitting.value = true
  try {
    await auth.register({
      businessName: form.businessName.trim(),
      ownerName: form.ownerName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      storeAddress: form.storeAddress.trim(),
    })
    submitted.value = true
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    if (status === 409) {
      formError.value = 'An account with this email already exists. Try logging in instead.'
    } else {
      formError.value = (err as { message?: string })?.message || 'Registration failed. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- Success screen -->
  <AuthCard
    v-if="submitted"
    title="Check your email"
    subtitle="One more step to activate your partner account."
  >
    <div class="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300">
      <p class="font-medium">We’ve sent a verification link to {{ form.email }}.</p>
      <p class="mt-2">
        Open the email and click the link to verify your address. After verification, our team reviews
        your application and you’ll be able to sign in and set up your catalog.
      </p>
    </div>
    <template #footer>
      Already verified?
      <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
        Go to login
      </NuxtLink>
    </template>
  </AuthCard>

  <!-- Form -->
  <AuthCard v-else title="Become a Rekados partner" subtitle="Tell us about your store to get started.">
    <form novalidate @submit.prevent="handleSubmit">
      <div class="space-y-4">
        <TextField
          v-model="form.businessName"
          label="Business / store name"
          name="businessName"
          autocomplete="organization"
          :required="true"
          :error="errors.businessName"
        />
        <TextField
          v-model="form.ownerName"
          label="Owner / contact name"
          name="ownerName"
          autocomplete="name"
          :required="true"
          :error="errors.ownerName"
        />
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
        <TextField
          v-model="form.phone"
          label="Phone"
          name="phone"
          type="tel"
          autocomplete="tel"
          placeholder="+63 900 000 0000"
          :required="true"
          :error="errors.phone"
        />
        <TextField
          v-model="form.storeAddress"
          label="Store address"
          name="storeAddress"
          autocomplete="street-address"
          :required="true"
          :error="errors.storeAddress"
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

        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
        </div>

        <Button type="submit" :loading="submitting" :block="true">Submit application</Button>

        <p class="text-center text-xs text-slate-500 dark:text-slate-400">
          By applying you agree to Rekados’ partner terms. Your password must be at least 12 characters
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
