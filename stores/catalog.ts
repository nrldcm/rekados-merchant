import { defineStore } from 'pinia'

/**
 * Catalog store (MOCK).
 *
 * This currently holds in-memory mock data so the UI is fully functional
 * without a backend. It is structured so each action maps cleanly to a future
 * REST call — see the TODO(backend) comments for the expected endpoints.
 */

export type ProductCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Pantry'
  | 'Bakery'
  | 'Beverages'
  | 'Frozen'
  | 'Other'

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry',
  'Bakery',
  'Beverages',
  'Frozen',
  'Other',
]

export interface Product {
  id: string
  name: string
  unit: string // e.g. "kg", "each", "bunch", "L"
  price: number // per unit, in the store's currency
  stock: number
  category: ProductCategory
}

export type ProductDraft = Omit<Product, 'id'>

const seed = (): Product[] => [
  { id: 'p-1001', name: 'Roma Tomatoes', unit: 'kg', price: 3.49, stock: 120, category: 'Produce' },
  { id: 'p-1002', name: 'Free-range Eggs', unit: 'dozen', price: 5.2, stock: 60, category: 'Dairy & Eggs' },
  { id: 'p-1003', name: 'Chicken Breast', unit: 'kg', price: 9.99, stock: 40, category: 'Meat & Seafood' },
  { id: 'p-1004', name: 'Olive Oil', unit: 'L', price: 12.5, stock: 25, category: 'Pantry' },
  { id: 'p-1005', name: 'Sourdough Loaf', unit: 'each', price: 4.75, stock: 18, category: 'Bakery' },
  { id: 'p-1006', name: 'Whole Milk', unit: 'L', price: 1.85, stock: 90, category: 'Dairy & Eggs' },
  { id: 'p-1007', name: 'Basmati Rice', unit: 'kg', price: 2.6, stock: 200, category: 'Pantry' },
  { id: 'p-1008', name: 'Fresh Basil', unit: 'bunch', price: 2.1, stock: 15, category: 'Produce' },
]

export const useCatalogStore = defineStore('catalog', () => {
  const products = ref<Product[]>(seed())
  const loading = ref(false)
  const search = ref('')

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return products.value
    return products.value.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  })

  const totalStockValue = computed(() =>
    products.value.reduce((sum, p) => sum + p.price * p.stock, 0),
  )

  const lowStockCount = computed(() => products.value.filter((p) => p.stock <= 20).length)

  // TODO(backend): GET /merchant/products
  const fetchAll = async (): Promise<void> => {
    loading.value = true
    try {
      // const api = useApi(); products.value = await api.get<Product[]>('/merchant/products')
      await Promise.resolve()
    } finally {
      loading.value = false
    }
  }

  // TODO(backend): POST /merchant/products
  const create = (draft: ProductDraft): Product => {
    const product: Product = { id: `p-${Date.now()}`, ...draft }
    products.value = [product, ...products.value]
    return product
  }

  // TODO(backend): PATCH /merchant/products/:id
  const update = (id: string, draft: ProductDraft): void => {
    products.value = products.value.map((p) => (p.id === id ? { ...p, ...draft, id } : p))
  }

  // TODO(backend): DELETE /merchant/products/:id
  const remove = (id: string): void => {
    products.value = products.value.filter((p) => p.id !== id)
  }

  const getById = (id: string): Product | undefined => products.value.find((p) => p.id === id)

  return {
    products,
    loading,
    search,
    filtered,
    totalStockValue,
    lowStockCount,
    fetchAll,
    create,
    update,
    remove,
    getById,
  }
})
