<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead({ title: 'Rekados for Merchants — Partner with us' })

const benefits = [
  {
    icon: '📦',
    title: 'Steady order flow',
    body: 'Receive ingredient orders generated straight from recipes customers love. No storefront setup required.',
  },
  {
    icon: '🧾',
    title: 'Simple catalog control',
    body: 'Manage products, units, pricing and stock in one clean dashboard. Update availability in seconds.',
  },
  {
    icon: '🚚',
    title: 'We handle delivery',
    body: 'You pack, we pick up and deliver to the customer. Focus on fulfilment, not logistics.',
  },
  {
    icon: '🔒',
    title: 'Secure by design',
    body: 'Bank-grade session security with httpOnly cookies. Your account and data stay protected.',
  },
]

const steps = [
  { n: '1', title: 'Apply', body: 'Register your store with a few business details.' },
  { n: '2', title: 'Get verified', body: 'Confirm your email and we review your application.' },
  { n: '3', title: 'List your catalog', body: 'Add the ingredients and products you stock.' },
  { n: '4', title: 'Fulfil orders', body: 'Accept, pack and hand off — we deliver.' },
]
</script>

<template>
  <div class="bg-white dark:bg-slate-950">
    <!-- Nav -->
    <header class="border-b border-slate-200 dark:border-slate-800">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div class="flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">R</span>
          <div class="leading-tight">
            <p class="font-semibold text-slate-900 dark:text-slate-100">Rekados</p>
            <p class="text-xs text-brand-600 dark:text-brand-400">for Merchants</p>
          </div>
        </div>
        <nav class="flex items-center gap-3">
          <NuxtLink to="/login" class="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300">
            Log in
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Apply now
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-white dark:from-brand-950/40 dark:via-slate-950 dark:to-slate-950" />
      <div class="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div class="max-w-2xl">
          <span class="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            Grocery &amp; store partners
          </span>
          <h1 class="mt-5 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            Partner with Rekados and turn recipes into orders
          </h1>
          <p class="mt-5 text-lg text-slate-600 dark:text-slate-300">
            Rekados turns the recipes people cook into ready-to-fulfil ingredient orders. Supply the
            groceries, we deliver to the customer. Grow revenue with zero storefront overhead.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              to="/register"
              class="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
            >
              Become a partner
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Merchant login
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 class="text-center text-3xl font-bold text-slate-900 dark:text-slate-50">Why sell with Rekados</h2>
      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="b in benefits" :key="b.title" class="card p-6">
          <div class="text-3xl" aria-hidden="true">{{ b.icon }}</div>
          <h3 class="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{{ b.title }}</h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ b.body }}</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-slate-50 py-16 dark:bg-slate-900/40">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-3xl font-bold text-slate-900 dark:text-slate-50">How it works</h2>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="s in steps" :key="s.n" class="relative rounded-xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
              {{ s.n }}
            </span>
            <h3 class="mt-4 font-semibold text-slate-900 dark:text-slate-100">{{ s.title }}</h3>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{{ s.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
      <h2 class="text-3xl font-bold text-slate-900 dark:text-slate-50">Ready to grow your store?</h2>
      <p class="mt-3 text-slate-600 dark:text-slate-300">Apply in minutes. Start receiving orders once verified.</p>
      <NuxtLink
        to="/register"
        class="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-brand-700"
      >
        Apply to become a partner
      </NuxtLink>
    </section>

    <footer class="border-t border-slate-200 py-8 dark:border-slate-800">
      <div class="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500 sm:px-6">
        &copy; {{ new Date().getFullYear() }} Rekados. Merchant partner portal.
      </div>
    </footer>
  </div>
</template>
