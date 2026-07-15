<script setup lang="ts">
/**
 * Full-page lock screen. When Lock Mode engages we navigate here and a global
 * middleware keeps every other app route redirecting back to it — so the app
 * content is never rendered while locked (nothing to reveal by deleting a
 * node), and the server independently rejects locked sessions with 423.
 */
definePageMeta({ layout: false })

const route = useRoute()
const { locked, unlock, refresh } = useLockMode()
const auth = useAuthStore()

const pin = ref('')
const error = ref<string | null>(null)
const working = ref(false)

function safeNext(): string {
  const next = (route.query.next as string) || '/app'
  return /^\/(?![/\\])/.test(next) && next !== '/locked' ? next : '/app'
}

onMounted(async () => {
  await refresh()
  if (!locked.value) await navigateTo(safeNext())
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
    await navigateTo(safeNext())
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Incorrect PIN.'
    pin.value = ''
  } finally {
    working.value = false
  }
}

async function signOut() {
  locked.value = false // clear the gate so /login isn't bounced back here
  await auth.logout?.()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-slate-900">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl dark:bg-brand-900/30" aria-hidden="true">🔒</div>
      <h1 class="text-lg font-bold text-slate-900 dark:text-white">Session locked</h1>
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
</template>
