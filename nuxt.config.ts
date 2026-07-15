// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    'nuxt-security',
    '@nuxt/eslint',
    '@vite-pwa/nuxt',
  ],

  // Installable PWA for merchants (Add to Home Screen). Precaches static assets
  // only; navigations/API stay on the network (SSR + encrypted proxy).
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Rekados Merchant',
      short_name: 'Rekados Biz',
      description: 'Manage your store, rekados, inventory and orders.',
      theme_color: '#059669',
      background_color: '#f8fafc',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
      cleanupOutdatedCaches: true,
    },
    devOptions: { enabled: false },
  },

  css: ['~/assets/css/tailwind.css'],

  // Dark mode is driven by the `dark` class on <html> (see app.vue / useColorScheme).
  // Tailwind `darkMode: 'class'` is configured in tailwind.config.ts.

  runtimeConfig: {
    // Public keys are exposed to the client. NEVER put secrets here.
    public: {
      // Base URL of the shared rekados-backend (NestJS). Override with NUXT_PUBLIC_API_BASE.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/v1',
    },
  },

  app: {
    head: {
      title: 'Rekados for Merchants',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Rekados for Merchants — grocery and store partners manage their catalog and fulfill ingredient orders.',
        },
        { name: 'theme-color', content: '#059669' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // enable in CI via `vue-tsc` if desired
  },

  // Security hardening. The backend is the source of truth for auth; these headers
  // protect the merchant SPA shell (XSS/clickjacking/transport).
  security: {
    strict: false,
    headers: {
      // Clickjacking protection.
      xFrameOptions: 'DENY',
      // HSTS — force HTTPS for a long period, include subdomains, allow preload.
      strictTransportSecurity: {
        maxAge: 63072000, // 2 years
        includeSubdomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: 'require-corp',
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'strict-origin-when-cross-origin',
      xContentTypeOptions: 'nosniff',
      xXSSProtection: '0',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
      contentSecurityPolicy: {
        'base-uri': ["'self'"],
        'default-src': ["'self'"],
        'font-src': ["'self'", 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        // Nuxt injects inline hydration state; 'unsafe-inline' for styles is needed by Tailwind.
        // Scripts use nonces/hashes injected by nuxt-security; 'strict-dynamic' allows chunked JS.
        'script-src': ["'self'", "'nonce-{{nonce}}'", "'strict-dynamic'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'object-src': ["'none'"],
        'worker-src': ["'self'"],
        'manifest-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        // Allow XHR/fetch to same-origin and the backend API base.
        // NOTE: keep this in sync with NUXT_PUBLIC_API_BASE (see .env.example).
        'connect-src': [
          "'self'",
          process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4004',
        ],
        'upgrade-insecure-requests': true,
      },
    },
    // Sensible request limits.
    requestSizeLimiter: {
      maxRequestSizeInBytes: 2_000_000,
      maxUploadFileRequestInBytes: 8_000_000,
    },
    rateLimiter: {
      tokensPerInterval: 150,
      interval: 60_000,
    },
    xssValidator: {},
    corsHandler: {
      // The SPA calls the backend directly with credentials; it does not proxy through Nuxt.
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
    },
  },
})
