<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Settings — Rekados Merchant' })

const auth = useAuthStore()
const api = useApi()
const { date } = useFormat()

interface MfaStatus {
  enabled: boolean
  defaultMethod: string | null
  fallbackMethod: string | null
  totpConfigured: boolean
  phoneVerified: boolean
  backupCodesRemaining: number
}

const { data: mfa, refresh: refreshMfa } = await useAsyncData<MfaStatus>(
  'mfa-status',
  () => api.get<MfaStatus>('/me/mfa'),
)
const { data: activity } = await useAsyncData<{ total: number; rows: { id: string; type: string; createdAt: string; ip: string | null }[] }>(
  'my-activity',
  () => api.get('/me/activity?take=20'),
  { default: () => ({ total: 0, rows: [] }) },
)
const { data: deletion, refresh: refreshDeletion } = await useAsyncData<{ status: string; requestedAt: string } | null>(
  'deletion',
  () => api.get('/me/deletion-request'),
  { default: () => null },
)

const msg = ref<string | null>(null)
const err = ref<string | null>(null)

// ---- TOTP setup ----
const totpSetup = ref<{ secret: string; otpauthUrl: string } | null>(null)
const totpCode = ref('')
const backupCodes = ref<string[] | null>(null)
const working = ref(false)

async function startTotp() {
  err.value = null
  totpSetup.value = await api.post<{ secret: string; otpauthUrl: string }>('/me/mfa/totp/setup')
}
async function confirmTotp() {
  working.value = true
  err.value = null
  try {
    const res = await api.post<{ backupCodes: string[] }>('/me/mfa/totp/confirm', { code: totpCode.value.trim() })
    backupCodes.value = res.backupCodes
    totpSetup.value = null
    totpCode.value = ''
    await refreshMfa()
  } catch (e: unknown) {
    err.value = (e as { message?: string })?.message || 'Invalid code.'
  } finally {
    working.value = false
  }
}
async function enableEmail() {
  err.value = null
  try {
    await api.post('/me/mfa/channel/enable', { method: 'EMAIL' })
    await refreshMfa()
    msg.value = 'Email 2FA enabled.'
  } catch (e: unknown) {
    err.value = (e as { message?: string })?.message || 'Could not enable.'
  }
}

// ---- disable / reset ----
const pwd = ref('')
async function disableMfa(reset = false) {
  if (!pwd.value) { err.value = 'Enter your password to confirm.'; return }
  working.value = true
  err.value = null
  try {
    await api.post(reset ? '/me/mfa/reset' : '/me/mfa/disable', { password: pwd.value })
    pwd.value = ''
    await refreshMfa()
    msg.value = reset ? '2FA reset.' : '2FA disabled.'
  } catch (e: unknown) {
    err.value = (e as { message?: string })?.message || 'Could not update 2FA.'
  } finally {
    working.value = false
  }
}
async function regenBackup() {
  const res = await api.post<{ codes: string[] }>('/me/mfa/backup-codes')
  backupCodes.value = res.codes
  await refreshMfa()
}

// ---- deletion ----
const delReason = ref('')
async function requestDeletion() {
  if (!confirm('Request deletion of your account? This is reviewed by Rekados.')) return
  try {
    await api.post('/me/deletion-request', { reason: delReason.value || undefined })
    await refreshDeletion()
    msg.value = 'Account deletion requested.'
  } catch (e: unknown) {
    err.value = (e as { message?: string })?.message || 'Could not request deletion.'
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <h1 class="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
    <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">Account &amp; security for {{ auth.user?.email }}</p>

    <div v-if="msg" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">{{ msg }}</div>
    <FormError v-if="err" :message="err" class="mb-4" />

    <!-- Backup codes reveal -->
    <div v-if="backupCodes" class="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p class="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">Save your backup codes — shown once</p>
      <div class="grid grid-cols-2 gap-1 font-mono text-sm text-amber-900 dark:text-amber-200 sm:grid-cols-5">
        <span v-for="c in backupCodes" :key="c">{{ c }}</span>
      </div>
      <button class="mt-3 text-xs font-medium text-amber-800 underline dark:text-amber-300" @click="backupCodes = null">I saved them</button>
    </div>

    <!-- MFA -->
    <section class="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Two-factor authentication</h2>
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Status:
        <span :class="mfa?.enabled ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-500'">
          {{ mfa?.enabled ? 'On' : 'Off' }}
        </span>
        <span v-if="mfa?.enabled" class="ml-1">— you choose how to receive your code (email, SMS or authenticator) each time you log in.</span>
      </p>

      <div v-if="!mfa?.enabled" class="space-y-3">
        <div v-if="!totpSetup">
          <Button size="sm" @click="startTotp">Set up authenticator app (TOTP)</Button>
          <Button size="sm" variant="secondary" class="ml-2" @click="enableEmail">Use email codes</Button>
        </div>
        <div v-else class="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <p class="text-sm text-slate-600 dark:text-slate-300">Add this secret to your authenticator app:</p>
          <code class="block break-all rounded bg-white px-2 py-1 text-sm dark:bg-slate-900">{{ totpSetup.secret }}</code>
          <a :href="totpSetup.otpauthUrl" class="text-xs text-brand-600 underline">Open in authenticator</a>
          <TextField v-model="totpCode" label="Enter the 6-digit code" name="totpCode" placeholder="123456" />
          <Button size="sm" :loading="working" @click="confirmTotp">Verify &amp; enable</Button>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Two-factor is on. At login you'll choose how to receive your code —
          <span class="font-medium">email</span><span v-if="mfa.phoneVerified">, <span class="font-medium">SMS</span></span><span v-if="mfa.totpConfigured"> or your <span class="font-medium">authenticator app</span></span>.
        </div>
        <p class="text-sm text-slate-500">Backup codes remaining: {{ mfa.backupCodesRemaining }}
          <button class="ml-2 text-xs font-medium text-brand-600 underline" @click="regenBackup">Regenerate</button>
        </p>
        <div class="rounded-lg border border-red-200 p-3 dark:border-red-900/50">
          <TextField v-model="pwd" label="Confirm password to disable / reset" name="pwd" type="password" />
          <div class="mt-2 flex gap-2">
            <Button size="sm" variant="danger" :loading="working" @click="disableMfa(false)">Disable 2FA</Button>
            <Button size="sm" variant="secondary" :loading="working" @click="disableMfa(true)">Reset 2FA</Button>
          </div>
        </div>
      </div>
    </section>

    <!-- Lock Mode -->
    <LockModeSettings />

    <!-- Activity -->
    <section class="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Activity log</h2>
      <ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <li v-for="a in activity?.rows" :key="a.id" class="flex items-center justify-between py-2">
          <span class="text-slate-700 dark:text-slate-200">{{ a.type }}</span>
          <span class="text-xs text-slate-400">{{ date(a.createdAt) }}<span v-if="a.ip"> · {{ a.ip }}</span></span>
        </li>
        <li v-if="!activity?.rows.length" class="py-2 text-slate-400">No activity yet.</li>
      </ul>
    </section>

    <!-- Danger -->
    <section class="rounded-xl border border-red-200 bg-white p-5 dark:border-red-900/50 dark:bg-slate-900">
      <h2 class="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">Request account deletion</h2>
      <p v-if="deletion" class="text-sm text-slate-500">A deletion request is <strong>{{ deletion.status }}</strong> (requested {{ date(deletion.requestedAt) }}).</p>
      <div v-else class="space-y-2">
        <TextField v-model="delReason" label="Reason (optional)" name="delReason" />
        <Button size="sm" variant="danger" @click="requestDeletion">Request deletion</Button>
      </div>
    </section>
  </div>
</template>
