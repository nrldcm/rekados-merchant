<script setup lang="ts">
/** Settings card for Lock Mode: set/change the PIN, enable/disable, lock now. */
const api = useApi()
const { status, refresh, engage } = useLockMode()

const msg = ref<string | null>(null)
const err = ref<string | null>(null)
const busy = ref(false)

onMounted(refresh)

// Set / change PIN
const newPin = ref('')
const confirmPin = ref('')
const changeMethod = ref<'CURRENT_PIN' | 'TOTP'>('CURRENT_PIN')
const proofCode = ref('')

function digits(v: string) {
  return v.replace(/[^0-9]/g, '').slice(0, 6)
}

async function savePin() {
  err.value = null; msg.value = null
  if (newPin.value.length !== 6) { err.value = 'PIN must be 6 digits.'; return }
  if (newPin.value !== confirmPin.value) { err.value = 'PINs do not match.'; return }
  busy.value = true
  try {
    const body: Record<string, unknown> = { pin: newPin.value, enable: !status.value.enabled }
    if (status.value.pinSet) {
      body.method = changeMethod.value
      if (changeMethod.value === 'CURRENT_PIN') body.currentPin = proofCode.value
      else body.code = proofCode.value
    }
    await api.post('/me/lock/pin', body)
    msg.value = status.value.pinSet ? 'PIN changed.' : 'PIN set and Lock Mode enabled.'
    newPin.value = ''; confirmPin.value = ''; proofCode.value = ''
    await refresh()
  } catch (e: unknown) {
    err.value = (e as { message?: string })?.message || 'Could not save PIN.'
  } finally { busy.value = false }
}

const disablePin = ref('')
async function toggle(enabled: boolean) {
  err.value = null; msg.value = null; busy.value = true
  try {
    await api.post('/me/lock/toggle', { enabled, pin: enabled ? undefined : disablePin.value })
    msg.value = enabled ? 'Lock Mode enabled.' : 'Lock Mode disabled.'
    disablePin.value = ''
    await refresh()
  } catch (e: unknown) {
    err.value = (e as { message?: string })?.message || 'Could not update Lock Mode.'
  } finally { busy.value = false }
}

async function lockNow() {
  await engage()
}
</script>

<template>
  <section class="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-3 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Lock Mode</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          A 6-digit PIN that locks the screen after 15 minutes idle. Separate from 2FA.
        </p>
      </div>
      <StatusBadge :tone="status.enabled ? 'green' : 'slate'" :label="status.enabled ? 'On' : 'Off'" dot />
    </div>

    <p v-if="msg" class="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{{ msg }}</p>
    <p v-if="err" class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{{ err }}</p>

    <!-- Set / change PIN -->
    <div class="space-y-3">
      <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ status.pinSet ? 'Change your PIN' : 'Set a PIN' }}</p>

      <template v-if="status.pinSet">
        <label class="block text-xs text-slate-500 dark:text-slate-400">Verify with</label>
        <div class="flex gap-2">
          <select v-model="changeMethod" class="input-base w-auto">
            <option value="CURRENT_PIN">Current PIN</option>
            <option value="TOTP">Authenticator (2FA)</option>
          </select>
          <input v-model="proofCode" :type="changeMethod === 'CURRENT_PIN' ? 'password' : 'text'" inputmode="numeric" class="input-base flex-1" :placeholder="changeMethod === 'CURRENT_PIN' ? 'Current 6-digit PIN' : '2FA code'" />
        </div>
      </template>

      <div class="grid gap-3 sm:grid-cols-2">
        <input :value="newPin" type="password" inputmode="numeric" maxlength="6" class="input-base" placeholder="New 6-digit PIN" @input="newPin = digits(($event.target as HTMLInputElement).value)" />
        <input :value="confirmPin" type="password" inputmode="numeric" maxlength="6" class="input-base" placeholder="Confirm PIN" @input="confirmPin = digits(($event.target as HTMLInputElement).value)" />
      </div>
      <AppButton size="sm" :disabled="busy" @click="savePin">{{ status.pinSet ? 'Update PIN' : 'Set PIN & enable' }}</AppButton>
    </div>

    <!-- Enable / disable + lock now -->
    <div v-if="status.pinSet" class="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
      <AppButton v-if="!status.enabled" size="sm" variant="secondary" :disabled="busy" @click="toggle(true)">Enable Lock Mode</AppButton>
      <template v-else>
        <AppButton size="sm" variant="secondary" @click="lockNow">Lock now</AppButton>
        <div class="flex items-center gap-2">
          <input v-model="disablePin" type="password" inputmode="numeric" maxlength="6" class="input-base w-40" placeholder="PIN to disable" />
          <AppButton size="sm" variant="danger" :disabled="busy" @click="toggle(false)">Disable</AppButton>
        </div>
      </template>
    </div>
  </section>
</template>
