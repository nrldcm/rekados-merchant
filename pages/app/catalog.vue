<script setup lang="ts">
import type { Column } from '~/types/table'
import { PRODUCT_CATEGORIES, type Product, type ProductDraft } from '~/stores/catalog'

definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Catalog — Rekados Merchant' })

const catalog = useCatalogStore()

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const columns: Column<Product>[] = [
  { key: 'name', label: 'Product' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'price', label: 'Price', align: 'right' },
  { key: 'stock', label: 'Stock', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
]

// --- Add / edit modal state ------------------------------------------------
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => editingId.value !== null)

const emptyDraft = (): ProductDraft => ({
  name: '',
  unit: 'each',
  price: 0,
  stock: 0,
  category: 'Produce',
})

const draft = reactive<ProductDraft>(emptyDraft())
const errors = reactive<Record<string, string | undefined>>({})

const openCreate = () => {
  editingId.value = null
  Object.assign(draft, emptyDraft())
  clearErrors()
  modalOpen.value = true
}

const openEdit = (p: Product) => {
  editingId.value = p.id
  Object.assign(draft, { name: p.name, unit: p.unit, price: p.price, stock: p.stock, category: p.category })
  clearErrors()
  modalOpen.value = true
}

const clearErrors = () => {
  errors.name = undefined
  errors.unit = undefined
  errors.price = undefined
  errors.stock = undefined
}

const validate = () => {
  errors.name = draft.name.trim() ? undefined : 'Name is required.'
  errors.unit = draft.unit.trim() ? undefined : 'Unit is required.'
  errors.price = draft.price >= 0 ? undefined : 'Price must be zero or more.'
  errors.stock = Number.isInteger(draft.stock) && draft.stock >= 0 ? undefined : 'Stock must be a whole number.'
  return !errors.name && !errors.unit && !errors.price && !errors.stock
}

const save = () => {
  if (!validate()) return
  const payload: ProductDraft = {
    name: draft.name.trim(),
    unit: draft.unit.trim(),
    price: Number(draft.price),
    stock: Number(draft.stock),
    category: draft.category,
  }
  if (isEditing.value && editingId.value) {
    catalog.update(editingId.value, payload)
  } else {
    catalog.create(payload)
  }
  modalOpen.value = false
}

// --- Delete confirm --------------------------------------------------------
const deleteTarget = ref<Product | null>(null)
const confirmDelete = () => {
  if (deleteTarget.value) catalog.remove(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">Catalog</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage the products and ingredients your store supplies.
        </p>
      </div>
      <Button @click="openCreate">+ Add product</Button>
    </div>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:max-w-xs">
        <TextField
          v-model="catalog.search"
          name="search"
          placeholder="Search by name or category…"
          aria-label="Search products"
        />
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400">
        {{ catalog.filtered.length }} of {{ catalog.products.length }} products ·
        Stock value {{ currency(catalog.totalStockValue) }}
      </p>
    </div>

    <DataTable :columns="columns" :rows="catalog.filtered" empty="No products match your search.">
      <template #cell-name="{ row }">
        <span class="font-medium text-slate-900 dark:text-slate-100">{{ row.name }}</span>
      </template>
      <template #cell-price="{ row }">
        {{ currency(row.price) }}
      </template>
      <template #cell-stock="{ row }">
        <span :class="row.stock <= 20 ? 'font-medium text-amber-600 dark:text-amber-400' : ''">
          {{ row.stock }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" @click="openEdit(row)">Edit</Button>
          <Button variant="ghost" size="sm" @click="deleteTarget = row">Delete</Button>
        </div>
      </template>
    </DataTable>

    <p class="mt-4 text-xs text-slate-400">
      Mock local store. TODO(backend): wire to GET/POST/PATCH/DELETE /merchant/products.
    </p>

    <!-- Add / edit modal -->
    <Modal
      v-model="modalOpen"
      :title="isEditing ? 'Edit product' : 'Add product'"
      description="Products appear in customer ingredient orders routed to your store."
    >
      <form class="space-y-4" novalidate @submit.prevent="save">
        <TextField v-model="draft.name" label="Name" name="name" :required="true" :error="errors.name" />

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="category" class="label-base">Category</label>
            <select id="category" v-model="draft.category" class="input-base">
              <option v-for="c in PRODUCT_CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <TextField v-model="draft.unit" label="Unit" name="unit" hint="e.g. kg, each, bunch" :required="true" :error="errors.unit" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="price" class="label-base">Price (per unit)</label>
            <input id="price" v-model.number="draft.price" type="number" min="0" step="0.01" class="input-base" >
            <FormError :message="errors.price" />
          </div>
          <div>
            <label for="stock" class="label-base">Stock</label>
            <input id="stock" v-model.number="draft.stock" type="number" min="0" step="1" class="input-base" >
            <FormError :message="errors.stock" />
          </div>
        </div>
      </form>

      <template #footer>
        <Button variant="secondary" @click="modalOpen = false">Cancel</Button>
        <Button @click="save">{{ isEditing ? 'Save changes' : 'Add product' }}</Button>
      </template>
    </Modal>

    <!-- Delete confirm -->
    <Modal
      :model-value="!!deleteTarget"
      title="Delete product?"
      @update:model-value="(v: boolean) => { if (!v) deleteTarget = null }"
    >
      <p class="text-sm text-slate-600 dark:text-slate-400">
        This will remove <span class="font-medium text-slate-900 dark:text-slate-100">{{ deleteTarget?.name }}</span>
        from your catalog. This action cannot be undone.
      </p>
      <template #footer>
        <Button variant="secondary" @click="deleteTarget = null">Cancel</Button>
        <Button variant="danger" @click="confirmDelete">Delete</Button>
      </template>
    </Modal>
  </div>
</template>
