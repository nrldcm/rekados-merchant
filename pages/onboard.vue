<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
useHead({ title: 'Set up your business — Rekados Merchant' })

const merchant = useMerchantStore()

const legalName = ref('')
const tradeName = ref('')
const mainBranchName = ref('')
const submitting = ref(false)
const formError = ref<string | null>(null)

async function submit() {
  formError.value = null
  if (legalName.value.trim().length < 2) {
    formError.value = 'Enter your registered business name.'
    return
  }
  submitting.value = true
  try {
    await merchant.register({
      legalName: legalName.value.trim(),
      tradeName: tradeName.value.trim() || undefined,
      mainBranchName: mainBranchName.value.trim() || undefined,
    })
    await navigateTo('/app')
  } catch (err: unknown) {
    formError.value = (err as { message?: string })?.message || 'Could not create your business. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard title="Set up your business" subtitle="Create your Rekados merchant and main branch.">
    <form novalidate @submit.prevent="submit">
      <div class="space-y-4">
        <TextField
          v-model="legalName"
          label="Registered business name"
          name="legalName"
          placeholder="Juan Dela Cruz Trading"
          :required="true"
        />
        <TextField
          v-model="tradeName"
          label="Store / trade name (optional)"
          name="tradeName"
          placeholder="Juan's Kitchen"
        />
        <TextField
          v-model="mainBranchName"
          label="Main branch name (optional)"
          name="mainBranchName"
          placeholder="Main Branch — Cebu City"
        />

        <div
          v-if="formError"
          class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {{ formError }}
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">
          This creates your merchant account, its main branch, and makes you the Owner.
          You can add sub-branches and staff afterward, and submit business documents (KYB)
          to activate the branch.
        </p>

        <Button type="submit" :loading="submitting" :block="true">Create business</Button>
      </div>
    </form>
  </AuthCard>
</template>
