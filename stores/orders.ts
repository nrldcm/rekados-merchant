import { defineStore } from 'pinia'

/**
 * Orders store (MOCK).
 *
 * In-memory incoming ingredient orders with a status flow the merchant drives:
 *   NEW → ACCEPTED → PACKED → READY_FOR_PICKUP
 *
 * Structured to swap to real endpoints later — see TODO(backend) comments.
 */

export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PACKED' | 'READY_FOR_PICKUP'

export const ORDER_FLOW: OrderStatus[] = ['NEW', 'ACCEPTED', 'PACKED', 'READY_FOR_PICKUP']

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  PACKED: 'Packed',
  READY_FOR_PICKUP: 'Ready for pickup',
}

export interface OrderItem {
  name: string
  quantity: number
  unit: string
}

export interface Order {
  id: string
  reference: string
  customerName: string
  createdAt: string // ISO date
  status: OrderStatus
  items: OrderItem[]
  total: number
}

const seed = (): Order[] => [
  {
    id: 'o-5001',
    reference: 'RKD-5001',
    customerName: 'Amara Bautista',
    createdAt: '2026-07-14T08:12:00.000Z',
    status: 'NEW',
    total: 27.4,
    items: [
      { name: 'Roma Tomatoes', quantity: 2, unit: 'kg' },
      { name: 'Fresh Basil', quantity: 1, unit: 'bunch' },
      { name: 'Olive Oil', quantity: 1, unit: 'L' },
    ],
  },
  {
    id: 'o-5002',
    reference: 'RKD-5002',
    customerName: 'Diego Santos',
    createdAt: '2026-07-14T07:45:00.000Z',
    status: 'ACCEPTED',
    total: 41.1,
    items: [
      { name: 'Chicken Breast', quantity: 2, unit: 'kg' },
      { name: 'Basmati Rice', quantity: 3, unit: 'kg' },
    ],
  },
  {
    id: 'o-5003',
    reference: 'RKD-5003',
    customerName: 'Liwayway Cruz',
    createdAt: '2026-07-13T16:20:00.000Z',
    status: 'PACKED',
    total: 15.35,
    items: [
      { name: 'Free-range Eggs', quantity: 1, unit: 'dozen' },
      { name: 'Sourdough Loaf', quantity: 2, unit: 'each' },
    ],
  },
  {
    id: 'o-5004',
    reference: 'RKD-5004',
    customerName: 'Noah Reyes',
    createdAt: '2026-07-13T11:05:00.000Z',
    status: 'READY_FOR_PICKUP',
    total: 9.25,
    items: [{ name: 'Whole Milk', quantity: 5, unit: 'L' }],
  },
]

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>(seed())
  const loading = ref(false)

  const openOrders = computed(() =>
    orders.value.filter((o) => o.status !== 'READY_FOR_PICKUP'),
  )

  const itemsToPack = computed(() =>
    orders.value
      .filter((o) => o.status === 'ACCEPTED' || o.status === 'NEW')
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
  )

  const revenueToday = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return orders.value
      .filter((o) => o.createdAt.slice(0, 10) === today)
      .reduce((sum, o) => sum + o.total, 0)
  })

  const countByStatus = (status: OrderStatus) =>
    computed(() => orders.value.filter((o) => o.status === status).length)

  // TODO(backend): GET /merchant/orders
  const fetchAll = async (): Promise<void> => {
    loading.value = true
    try {
      // const api = useApi(); orders.value = await api.get<Order[]>('/merchant/orders')
      await Promise.resolve()
    } finally {
      loading.value = false
    }
  }

  const getById = (id: string): Order | undefined => orders.value.find((o) => o.id === id)

  const nextStatus = (status: OrderStatus): OrderStatus | null => {
    const idx = ORDER_FLOW.indexOf(status)
    return idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1]! : null
  }

  // TODO(backend): PATCH /merchant/orders/:id/status  { status }
  const setStatus = (id: string, status: OrderStatus): void => {
    orders.value = orders.value.map((o) => (o.id === id ? { ...o, status } : o))
  }

  // TODO(backend): PATCH /merchant/orders/:id/status advancing to the next step.
  const advance = (id: string): void => {
    const order = getById(id)
    if (!order) return
    const next = nextStatus(order.status)
    if (next) setStatus(id, next)
  }

  return {
    orders,
    loading,
    openOrders,
    itemsToPack,
    revenueToday,
    countByStatus,
    fetchAll,
    getById,
    nextStatus,
    setStatus,
    advance,
  }
})
