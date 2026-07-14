<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Rekados — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso } = useFormat()

interface InvItem { id: string; name: string; unit: string }
interface Ingredient {
  id?: string
  itemId: string
  quantity: number
  isOptional: boolean
  addonPrice: number
  item?: { name: string; unit: string }
}
interface Rekados {
  id: string
  name: string
  description: string | null
  basePrice: number
  pricingMode: 'FIXED' | 'ESTIMATED'
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  availableKits: number
  pricing: { mode: string; basePrice: number; maxPrice: number }
  ingredients: Ingredient[]
}

const { data: rekados, pending, refresh } = await useAsyncData<Rekados[]>(
  () => `catalog-${merchant.activeBranchId}`,
  () => api.get<Rekados[]>('/merchant/catalog'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)
const { data: inventory } = await useAsyncData<InvItem[]>(
  () => `catalog-inv-${merchant.activeBranchId}`,
  () => api.get<InvItem[]>('/merchant/inventory'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

const showForm = ref(false)
const editing = ref<Rekados | null>(null)
const form = reactive({ name: '', description: '', basePrice: 0, ingredients: [] as Ingredient[] })
const saving = ref(false)
const error = ref<string | null>(null)

const hasOptional = computed(() => form.ingredients.some((i) => i.isOptional))

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', description: '', basePrice: 0, ingredients: [] })
  addLine()
  error.value = null
  showForm.value = true
}
function openEdit(r: Rekados) {
  editing.value = r
  Object.assign(form, {
    name: r.name,
    description: r.description ?? '',
    basePrice: Number(r.basePrice),
    ingredients: r.ingredients.map((i) => ({
      itemId: i.itemId, quantity: Number(i.quantity), isOptional: i.isOptional, addonPrice: Number(i.addonPrice),
    })),
  })
  error.value = null
  showForm.value = true
}
function addLine() {
  form.ingredients.push({ itemId: inventory.value?.[0]?.id ?? '', quantity: 1, isOptional: false, addonPrice: 0 })
}
function removeLine(idx: number) {
  form.ingredients.splice(idx, 1)
}

async function save() {
  saving.value = true
  error.value = null
  try {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      basePrice: Number(form.basePrice),
      ingredients: form.ingredients.map((i, idx) => ({
        itemId: i.itemId, quantity: Number(i.quantity),
        isOptional: i.isOptional, addonPrice: Number(i.addonPrice), sortOrder: idx,
      })),
    }
    if (editing.value) await api.patch(`/merchant/catalog/${editing.value.id}`, payload)
    else await api.post('/merchant/catalog', payload)
    showForm.value = false
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not save rekados.'
  } finally {
    saving.value = false
  }
}

async function setStatus(r: Rekados, status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT') {
  try {
    await api.patch(`/merchant/catalog/${r.id}/status`, { status })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not update status.'
  }
}
async function remove(r: Rekados) {
  if (!confirm(`Delete "${r.name}"?`)) return
  await api.del(`/merchant/catalog/${r.id}`)
  await refresh()
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Rekados</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Recipe kits built from your inventory · availability is live</p>
      </div>
      <Button v-if="merchant.can('catalog:create')" @click="openCreate">+ New rekados</Button>
    </header>

    <p v-if="pending" class="text-sm text-slate-500">Loading…</p>
    <p v-else-if="!rekados?.length" class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
      No rekados yet. Create your first recipe kit (e.g. “Filipino Style Spaghetti”).
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="r in rekados"
        :key="r.id"
        class="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ r.name }}</h3>
            <p class="text-xs text-slate-400">{{ r.ingredients.length }} ingredients · {{ r.pricingMode }}</p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
            :class="{
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': r.status === 'ACTIVE',
              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': r.status === 'DRAFT',
              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': r.status === 'ARCHIVED',
            }"
          >{{ r.status }}</span>
        </div>

        <div class="mt-3 flex items-end justify-between">
          <div>
            <p class="text-lg font-bold text-slate-900 dark:text-slate-100">
              {{ peso(r.pricing.basePrice) }}<span v-if="r.pricingMode === 'ESTIMATED'" class="text-xs font-normal text-slate-400"> + add-ons</span>
            </p>
            <p class="text-xs text-slate-400">up to {{ peso(r.pricing.maxPrice) }}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold" :class="r.availableKits > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">
              {{ r.availableKits }}
            </p>
            <p class="text-xs text-slate-400">can sell now</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button v-if="merchant.can('catalog:update') && r.status !== 'ACTIVE'" class="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" @click="setStatus(r, 'ACTIVE')">Activate</button>
          <button v-if="merchant.can('catalog:update') && r.status === 'ACTIVE'" class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" @click="setStatus(r, 'ARCHIVED')">Archive</button>
          <button v-if="merchant.can('catalog:update')" class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" @click="openEdit(r)">Edit</button>
          <button v-if="merchant.can('catalog:delete')" class="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" @click="remove(r)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Create / edit modal -->
    <Modal v-model="showForm" :title="editing ? 'Edit rekados' : 'New rekados'">
      <div class="space-y-4">
        <TextField v-model="form.name" label="Name" name="name" placeholder="Filipino Style Spaghetti" :required="true" />
        <TextField v-model="form.description" label="Description (optional)" name="description" />
        <TextField v-model.number="form.basePrice" label="Base price (₱)" name="basePrice" type="number"
          :hint="hasOptional ? 'Estimated pricing: base + selected add-ons' : 'Fixed price (no optional items)'" />

        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-200">Ingredients</span>
            <button type="button" class="text-xs font-medium text-brand-600" @click="addLine">+ Add ingredient</button>
          </div>
          <p v-if="!inventory?.length" class="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            Add inventory items first — a rekados is built from them.
          </p>
          <div class="space-y-2">
            <div v-for="(line, idx) in form.ingredients" :key="idx" class="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <div class="flex flex-wrap items-center gap-2">
                <select v-model="line.itemId" class="input-base min-w-[8rem] flex-1">
                  <option v-for="it in inventory" :key="it.id" :value="it.id">{{ it.name }} ({{ it.unit }})</option>
                </select>
                <input v-model.number="line.quantity" type="number" step="any" class="input-base w-20" placeholder="Qty" />
                <button type="button" class="text-slate-400 hover:text-red-500" aria-label="Remove" @click="removeLine(idx)">✕</button>
              </div>
              <div class="mt-2 flex items-center gap-3 text-xs">
                <label class="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <input v-model="line.isOptional" type="checkbox" class="rounded" /> Optional add-on
                </label>
                <div v-if="line.isOptional" class="flex items-center gap-1">
                  <span class="text-slate-400">+₱</span>
                  <input v-model.number="line.addonPrice" type="number" step="any" class="input-base w-24 py-1" placeholder="Add-on price" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <FormError v-if="error" :message="error" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showForm = false">Cancel</Button>
        <Button :loading="saving" @click="save">{{ editing ? 'Save' : 'Create' }}</Button>
      </template>
    </Modal>
  </div>
</template>
