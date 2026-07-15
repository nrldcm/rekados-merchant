<script setup lang="ts">
import type { Column } from '~/types/table'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Inventory — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { peso, qty } = useFormat()

interface Item {
  id: string
  name: string
  sku: string | null
  unit: string
  stockOnHand: string
  stockReserved: string
  unitCost: string
  price: string
  reorderLevel: string
  isActive: boolean
}

const { data: items, pending, refresh } = await useAsyncData<Item[]>(
  () => `inventory-${merchant.activeBranchId}`,
  () => api.get<Item[]>('/merchant/inventory'),
  { watch: [() => merchant.activeBranchId], default: () => [] },
)

const available = (i: Item) => Number(i.stockOnHand) - Number(i.stockReserved)

const columns: Column<Item>[] = [
  { key: 'name', label: 'Item' },
  { key: 'stockOnHand', label: 'On hand', align: 'right' },
  { key: 'stockReserved', label: 'Reserved', align: 'right' },
  { key: 'available', label: 'Available', align: 'right' },
  { key: 'unitCost', label: 'Cost', align: 'right' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
]

// ---- Create / edit ----
const showForm = ref(false)
const editing = ref<Item | null>(null)
const form = reactive({ name: '', sku: '', unit: 'pc', unitCost: 0, price: 0, reorderLevel: 0, openingStock: 0 })
const saving = ref(false)
const error = ref<string | null>(null)

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', sku: '', unit: 'pc', unitCost: 0, reorderLevel: 0, openingStock: 0 })
  error.value = null
  showForm.value = true
}
function openEdit(i: Item) {
  editing.value = i
  Object.assign(form, {
    name: i.name, sku: i.sku ?? '', unit: i.unit,
    unitCost: Number(i.unitCost), price: Number(i.price), reorderLevel: Number(i.reorderLevel), openingStock: 0,
  })
  error.value = null
  showForm.value = true
}

async function save() {
  saving.value = true
  error.value = null
  try {
    if (editing.value) {
      await api.patch(`/merchant/inventory/${editing.value.id}`, {
        name: form.name, sku: form.sku || undefined, unit: form.unit,
        price: Number(form.price), reorderLevel: Number(form.reorderLevel),
      })
    } else {
      await api.post('/merchant/inventory', {
        name: form.name, sku: form.sku || undefined, unit: form.unit,
        unitCost: Number(form.unitCost), price: Number(form.price), reorderLevel: Number(form.reorderLevel),
        openingStock: Number(form.openingStock),
      })
    }
    showForm.value = false
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not save item.'
  } finally {
    saving.value = false
  }
}

// ---- Adjust / receive ----
const stockModal = ref<{ mode: 'adjust' | 'receive'; item: Item } | null>(null)
const stockForm = reactive({ quantity: 0, unitCost: 0, reason: '' })
const stockSaving = ref(false)

function openStock(mode: 'adjust' | 'receive', item: Item) {
  stockModal.value = { mode, item }
  Object.assign(stockForm, { quantity: 0, unitCost: Number(item.unitCost), reason: '' })
  error.value = null
}
async function submitStock() {
  if (!stockModal.value) return
  stockSaving.value = true
  error.value = null
  try {
    const { mode, item } = stockModal.value
    if (mode === 'adjust') {
      await api.post(`/merchant/inventory/${item.id}/adjust`, {
        quantity: Number(stockForm.quantity), reason: stockForm.reason || undefined,
      })
    } else {
      await api.post(`/merchant/inventory/${item.id}/receive`, {
        quantity: Number(stockForm.quantity), unitCost: Number(stockForm.unitCost), note: stockForm.reason || undefined,
      })
    }
    stockModal.value = null
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not update stock.'
  } finally {
    stockSaving.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ merchant.activeBranch?.name }} · stock per branch</p>
      </div>
      <Button v-if="merchant.can('inventory:create')" @click="openCreate">+ New item</Button>
    </header>

    <DataTable :columns="columns" :rows="items || []" :loading="pending" empty="No inventory items yet.">
      <template #cell-name="{ row }">
        <div class="font-medium text-slate-900 dark:text-slate-100">{{ row.name }}</div>
        <div class="text-xs text-slate-400">{{ row.sku || '—' }} · {{ row.unit }}</div>
      </template>
      <template #cell-stockOnHand="{ row }">{{ qty(row.stockOnHand) }}</template>
      <template #cell-stockReserved="{ row }">{{ qty(row.stockReserved) }}</template>
      <template #cell-available="{ row }">
        <span :class="available(row) <= Number(row.reorderLevel) ? 'font-semibold text-amber-600 dark:text-amber-400' : ''">
          {{ qty(available(row)) }}
        </span>
      </template>
      <template #cell-unitCost="{ row }">{{ peso(row.unitCost) }}</template>
      <template #cell-price="{ row }">
        <span :class="Number(row.price) > 0 ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-400'">
          {{ Number(row.price) > 0 ? peso(row.price) : '—' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1.5">
          <button v-if="merchant.can('inventory:update')" class="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30" @click="openStock('receive', row)">Receive</button>
          <button v-if="merchant.can('inventory:adjust')" class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" @click="openStock('adjust', row)">Adjust</button>
          <button v-if="merchant.can('inventory:update')" class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" @click="openEdit(row)">Edit</button>
        </div>
      </template>
    </DataTable>

    <!-- Create / edit modal -->
    <Modal v-model="showForm" :title="editing ? 'Edit item' : 'New item'">
      <div class="space-y-4">
        <TextField v-model="form.name" label="Item name" name="name" :required="true" />
        <div class="grid grid-cols-2 gap-3">
          <TextField v-model="form.sku" label="SKU (optional)" name="sku" />
          <TextField v-model="form.unit" label="Unit" name="unit" placeholder="pc / kg / L" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <TextField v-model.number="form.unitCost" label="Unit cost (₱)" name="unitCost" type="number" :disabled="!!editing" />
          <TextField v-model.number="form.price" label="Price today (₱)" name="price" type="number" hint="Sell price per unit — sets kit prices" />
          <TextField v-model.number="form.reorderLevel" label="Reorder level" name="reorderLevel" type="number" />
        </div>
        <TextField v-if="!editing" v-model.number="form.openingStock" label="Opening stock" name="openingStock" type="number" />
        <FormError v-if="error" :message="error" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="showForm = false">Cancel</Button>
        <Button :loading="saving" @click="save">{{ editing ? 'Save' : 'Create' }}</Button>
      </template>
    </Modal>

    <!-- Adjust / receive modal -->
    <Modal :model-value="!!stockModal" :title="stockModal?.mode === 'receive' ? 'Receive stock' : 'Adjust stock'" @update:model-value="stockModal = null">
      <div v-if="stockModal" class="space-y-4">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ stockModal.item.name }}</p>
        <TextField
          v-model.number="stockForm.quantity"
          :label="stockModal.mode === 'receive' ? 'Quantity received' : 'Quantity (+/−)'"
          name="quantity" type="number" :required="true"
        />
        <TextField v-if="stockModal.mode === 'receive'" v-model.number="stockForm.unitCost" label="Unit cost (₱)" name="unitCost" type="number" />
        <TextField v-model="stockForm.reason" :label="stockModal.mode === 'receive' ? 'Note (optional)' : 'Reason'" name="reason" />
        <FormError v-if="error" :message="error" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="stockModal = null">Cancel</Button>
        <Button :loading="stockSaving" @click="submitStock">Confirm</Button>
      </template>
    </Modal>
  </div>
</template>
