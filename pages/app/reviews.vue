<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
useHead({ title: 'Reviews — Rekados Merchant' })

const merchant = useMerchantStore()
const api = useApi()
const { date } = useFormat()

interface Reply {
  id: string
  authorName: string
  isMerchant: boolean
  body: string
  createdAt: string
}
interface Review {
  id: string
  rating: number
  title: string
  body: string
  verified: boolean
  helpfulUp: number
  helpfulDown: number
  createdAt: string
  author: string
  hasMerchantReply: boolean
  replies: Reply[]
}
interface ReviewsPage {
  total: number
  rows: Review[]
}

const take = 20
const skip = ref(0)

const { data, pending, refresh } = await useAsyncData<ReviewsPage>(
  () => `reviews-${merchant.activeBranchId}-${skip.value}`,
  () => api.get<ReviewsPage>(`/merchant/reviews?skip=${skip.value}&take=${take}`),
  { watch: [() => merchant.activeBranchId, skip], default: () => ({ total: 0, rows: [] }) },
)

const reviews = computed(() => data.value?.rows ?? [])
const total = computed(() => data.value?.total ?? 0)
const canPrev = computed(() => skip.value > 0)
const canNext = computed(() => skip.value + take < total.value)

function stars(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

// ---- Reply ----
const replyFor = ref<Review | null>(null)
const replyBody = ref('')
const replying = ref(false)
const error = ref<string | null>(null)

function openReply(review: Review) {
  replyFor.value = review
  replyBody.value = ''
  error.value = null
}

async function submitReply() {
  if (!replyFor.value) return
  const body = replyBody.value.trim()
  if (!body) {
    error.value = 'Reply cannot be empty.'
    return
  }
  replying.value = true
  error.value = null
  try {
    await api.post(`/merchant/reviews/${replyFor.value.id}/reply`, { body })
    replyFor.value = null
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not post reply.'
  } finally {
    replying.value = false
  }
}
</script>

<template>
  <div>
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Reviews</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ merchant.activeBranch?.name }} · {{ total }} {{ total === 1 ? 'review' : 'reviews' }}
        </p>
      </div>
    </header>

    <p v-if="pending" class="text-sm text-slate-500">Loading…</p>

    <p
      v-else-if="!reviews.length"
      class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900"
    >
      No reviews yet.
    </p>

    <div v-else class="space-y-4">
      <article
        v-for="r in reviews"
        :key="r.id"
        class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-base tracking-wide text-amber-500" :aria-label="`${r.rating} out of 5 stars`">
            {{ stars(r.rating) }}
          </span>
          <span
            v-if="r.verified"
            class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          >
            Verified purchase
          </span>
        </div>

        <h3 v-if="r.title" class="mt-2 font-bold text-slate-900 dark:text-slate-100">{{ r.title }}</h3>
        <p v-if="r.body" class="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{{ r.body }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span class="flex items-center gap-2">
            <span class="text-emerald-600 dark:text-emerald-400">↑ {{ r.helpfulUp }}</span>
            <span class="text-red-500 dark:text-red-400">↓ {{ r.helpfulDown }}</span>
          </span>
          <span>{{ r.author }} · {{ date(r.createdAt) }}</span>
        </div>

        <!-- Replies -->
        <div v-if="r.replies?.length" class="mt-3 space-y-2 border-l-2 border-slate-100 pl-3 dark:border-slate-800">
          <div
            v-for="reply in r.replies"
            :key="reply.id"
            class="rounded-lg p-2.5"
            :class="reply.isMerchant
              ? 'bg-brand-50 dark:bg-brand-900/20'
              : 'bg-slate-50 dark:bg-slate-800/50'"
          >
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ reply.authorName }}</span>
              <span
                v-if="reply.isMerchant"
                class="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
              >
                Merchant
              </span>
              <span class="text-slate-400">{{ date(reply.createdAt) }}</span>
            </div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{{ reply.body }}</p>
          </div>
        </div>

        <!-- Reply action -->
        <div v-if="merchant.can('reviews:reply') && !r.hasMerchantReply" class="mt-3">
          <Button variant="secondary" size="sm" @click="openReply(r)">Reply</Button>
        </div>
      </article>

      <!-- Pagination -->
      <div v-if="canPrev || canNext" class="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" :disabled="!canPrev" @click="skip = Math.max(0, skip - take)">Previous</Button>
        <span class="text-xs text-slate-400">
          {{ skip + 1 }}–{{ Math.min(skip + take, total) }} of {{ total }}
        </span>
        <Button variant="ghost" size="sm" :disabled="!canNext" @click="skip = skip + take">Next</Button>
      </div>
    </div>

    <!-- Reply modal -->
    <Modal :model-value="!!replyFor" title="Reply to review" @update:model-value="replyFor = null">
      <div v-if="replyFor" class="space-y-4">
        <div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <span class="text-amber-500">{{ stars(replyFor.rating) }}</span>
          <span class="ml-2 font-medium text-slate-700 dark:text-slate-200">{{ replyFor.title }}</span>
          <p class="mt-1 text-slate-500 dark:text-slate-400">{{ replyFor.author }}</p>
        </div>
        <div>
          <label for="reply-body" class="label-base">Your reply</label>
          <textarea
            id="reply-body"
            v-model="replyBody"
            name="body"
            rows="4"
            class="input-base"
            placeholder="Thank the customer or address their feedback…"
          />
        </div>
        <FormError v-if="error" :message="error" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="replyFor = null">Cancel</Button>
        <Button :loading="replying" @click="submitReply">Post reply</Button>
      </template>
    </Modal>
  </div>
</template>
