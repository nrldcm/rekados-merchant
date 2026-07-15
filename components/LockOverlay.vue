<script setup lang="ts">
/**
 * Full-screen, non-dismissable PIN overlay shown whenever the session is locked
 * (idle timeout or a 423 from the API). Unlocking is server-verified.
 */
const { locked, unlock } = useLockMode()
const auth = useAuthStore()

const pin = ref('')
const error = ref<string | null>(null)
const working = ref(false)

watch(locked, (v) => {
  if (v) {
    pin.value = ''
    error.value = null
  }
})

async function submit() {
  if (pin.value.length !== 6) {
    error.value = 'Enter your 6-digit PIN.'
    return
  }
  working.value = true
  error.value = null
  try {
    await unlock(pin.value)
    pin.value = ''
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Incorrect PIN.'
    pin.value = ''
  } finally {
    working.value = false
  }
}

async function signOut() {
  await auth.logout?.()
  await navigateTo('/login')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="locked"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Session locked"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-slate-900">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-900/30" aria-hidden="true">🔒</div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Session locked</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter your 6-digit PIN to continue.</p>

        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          autocomplete="off"
          maxlength="6"
          class="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] dark:border-slate-700 dark:bg-slate-800"
          placeholder="······"
          autofocus
          @input="pin = pin.replace(/[^0-9]/g, '')"
          @keyup.enter="submit"
        />

        <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{{ error }}</p>

        <button
          class="mt-5 w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          :disabled="working"
          @click="submit"
        >
          {{ working ? 'Unlocking…' : 'Unlock' }}
        </button>
        <button class="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" @click="signOut">
          Not you? Sign out
        </button>
      </div>
    </div>
  </Teleport>
</template>
