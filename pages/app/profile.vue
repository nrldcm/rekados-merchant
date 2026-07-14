<script setup lang="ts">
import { isValidEmail, isValidPhone, isNonEmpty } from '~/utils/validation'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Store profile — Rekados Merchant' })

const auth = useAuthStore()

// --- Store profile (MOCK) --------------------------------------------------
// TODO(backend): load via GET /merchant/profile and save via PATCH /merchant/profile.
const profile = reactive({
  businessName: auth.user?.businessName || 'My Rekados Store',
  ownerName: [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ') || 'Store Owner',
  email: auth.user?.email || 'owner@store.com',
  phone: '+63 900 000 0000',
  storeAddress: '123 Market Street, Quezon City',
})

const errors = reactive<Record<string, string | undefined>>({})
const savingProfile = ref(false)
const profileSaved = ref(false)

const validateProfile = () => {
  errors.businessName = isNonEmpty(profile.businessName) ? undefined : 'Business name is required.'
  errors.ownerName = isNonEmpty(profile.ownerName) ? undefined : 'Owner name is required.'
  errors.email = isValidEmail(profile.email) ? undefined : 'Enter a valid email.'
  errors.phone = isValidPhone(profile.phone) ? undefined : 'Enter a valid phone number.'
  errors.storeAddress = isNonEmpty(profile.storeAddress) ? undefined : 'Store address is required.'
  return Object.values(errors).every((e) => !e)
}

const saveProfile = async () => {
  profileSaved.value = false
  if (!validateProfile()) return
  savingProfile.value = true
  try {
    // TODO(backend): await useApi().patch('/merchant/profile', { ...profile })
    await new Promise((r) => setTimeout(r, 400))
    profileSaved.value = true
  } finally {
    savingProfile.value = false
  }
}

// --- Business hours (MOCK) -------------------------------------------------
// TODO(backend): part of the merchant profile payload.
interface DayHours {
  day: string
  open: boolean
  from: string
  to: string
}
const hours = reactive<DayHours[]>([
  { day: 'Monday', open: true, from: '08:00', to: '18:00' },
  { day: 'Tuesday', open: true, from: '08:00', to: '18:00' },
  { day: 'Wednesday', open: true, from: '08:00', to: '18:00' },
  { day: 'Thursday', open: true, from: '08:00', to: '18:00' },
  { day: 'Friday', open: true, from: '08:00', to: '20:00' },
  { day: 'Saturday', open: true, from: '09:00', to: '20:00' },
  { day: 'Sunday', open: false, from: '09:00', to: '13:00' },
])

const savingHours = ref(false)
const hoursSaved = ref(false)
const saveHours = async () => {
  hoursSaved.value = false
  savingHours.value = true
  try {
    // TODO(backend): await useApi().patch('/merchant/profile/hours', { hours })
    await new Promise((r) => setTimeout(r, 400))
    hoursSaved.value = true
  } finally {
    savingHours.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">Store profile</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Keep your business details and hours up to date.
      </p>
    </div>

    <!-- Business details -->
    <section class="card p-6">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Business details</h2>
      <form class="mt-4 space-y-4" novalidate @submit.prevent="saveProfile">
        <TextField v-model="profile.businessName" label="Business name" name="businessName" :required="true" :error="errors.businessName" />
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField v-model="profile.ownerName" label="Owner name" name="ownerName" :required="true" :error="errors.ownerName" />
          <TextField v-model="profile.phone" label="Phone" name="phone" type="tel" :required="true" :error="errors.phone" />
        </div>
        <TextField v-model="profile.email" label="Email" name="email" type="email" :required="true" :error="errors.email" />
        <TextField v-model="profile.storeAddress" label="Store address" name="storeAddress" :required="true" :error="errors.storeAddress" />

        <div class="flex items-center gap-3">
          <Button type="submit" :loading="savingProfile">Save details</Button>
          <span v-if="profileSaved" class="text-sm font-medium text-brand-600 dark:text-brand-400">Saved ✓</span>
        </div>
      </form>
    </section>

    <!-- Business hours -->
    <section class="card mt-6 p-6">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Business hours</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">When your store can accept and pack orders.</p>

      <div class="mt-4 space-y-2">
        <div
          v-for="row in hours"
          :key="row.day"
          class="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center"
        >
          <label class="flex w-40 items-center gap-2">
            <input v-model="row.open" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500">
            <span class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ row.day }}</span>
          </label>

          <div v-if="row.open" class="flex items-center gap-2">
            <input v-model="row.from" type="time" class="input-base w-32" :aria-label="`${row.day} open time`">
            <span class="text-slate-400">to</span>
            <input v-model="row.to" type="time" class="input-base w-32" :aria-label="`${row.day} close time`">
          </div>
          <span v-else class="text-sm text-slate-400">Closed</span>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <Button :loading="savingHours" @click="saveHours">Save hours</Button>
        <span v-if="hoursSaved" class="text-sm font-medium text-brand-600 dark:text-brand-400">Saved ✓</span>
      </div>
    </section>

    <p class="mt-4 text-xs text-slate-400">
      Mock data for scaffolding. TODO(backend): GET/PATCH /merchant/profile.
    </p>
  </div>
</template>
