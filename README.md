# Rekados — Merchant Web App

The **merchant** web app for Rekados. Rekados lets people discover recipes, turns
those recipes into ingredient lists, buys the ingredients from partner
**merchants/stores**, and delivers them to the customer.

This repository is the portal where grocery/store partners **manage their catalog
and fulfil ingredient orders**. It is one of several Rekados web apps that share a
single core API, [`rekados-backend`](#talking-to-rekados-backend) (NestJS).

> **Public repository — no secrets.** Auth tokens live in httpOnly cookies issued
> by the backend and are never handled in JS. `.env.example` contains only safe
> placeholders.

---

## Stack

- **Nuxt 3** + **TypeScript** (`<script setup lang="ts">`)
- **Pinia** (`@pinia/nuxt`) for state
- **Tailwind CSS** (`@nuxtjs/tailwindcss`) — emerald/slate "business" theme, dark-mode friendly
- **nuxt-security** — hardened CSP, HSTS, frame-guard, and other headers
- **Node 20**
- Default dev port **3005**

---

## Pages

Public:

| Route | Purpose |
| --- | --- |
| `/` | Merchant landing — "Partner with Rekados", benefits, CTAs |
| `/login` | Email + password login (handles 403 unverified with a resend link, and role-mismatch notice) |
| `/register` | Merchant onboarding (business/owner/email/phone/password + confirm + address) → "check your email" screen |
| `/verify-email?token=` | Verifies the emailed token; resend option on failure |
| `/forgot-password` | Requests a reset link (no account enumeration) |
| `/reset-password?token=` | Sets a new password from the emailed token |

Protected (middleware `auth` + `role === 'MERCHANT'`):

| Route | Purpose |
| --- | --- |
| `/app` | Dashboard KPIs (open orders, items to pack, revenue, low stock) + recent orders |
| `/app/catalog` | Product/ingredient catalog CRUD (name, unit, price, stock, category) with search |
| `/app/orders` | Incoming ingredient orders list + detail; status flow `NEW → ACCEPTED → PACKED → READY_FOR_PICKUP` |
| `/app/profile` | Store profile + business hours |

All protected data is currently **mock** (in-memory Pinia stores) so the UI is fully
functional without a backend. Each store action is structured to map onto a real
endpoint later — search the code for `TODO(backend)`.

---

## Shared auth model (identical across all Rekados web apps)

The backend issues **httpOnly, secure, sameSite** cookies for the access and
refresh tokens. JavaScript **cannot** read them, which makes the app resistant to
token theft via XSS. Consequences that shape this codebase:

- **`composables/useApi.ts`** — wraps `$fetch` with `credentials: 'include'` and a
  base URL from `runtimeConfig.public.apiBase` (`NUXT_PUBLIC_API_BASE`, default
  `http://localhost:4004/api/v1`). On a `401` it attempts a single
  `POST /auth/refresh` (which rotates the cookies server-side) and retries the
  request once; if it still fails, it redirects to `/login`. Concurrent 401s share
  one in-flight refresh.
- **`stores/auth.ts`** — the user identity is derived entirely from
  `GET /auth/me`. Tokens are **never** read in JS; **no PII or tokens** are stored
  in `localStorage`. State is in-memory and re-hydrates on refresh via `fetchMe()`.
- **`middleware/auth.ts`** — protects the `/app` area: ensures the session is
  loaded, redirects anonymous users to `/login`, and **gates on
  `user.role === 'MERCHANT'`** — an authenticated non-merchant gets an explicit
  **403 "Not authorized"** screen.

The only browser-persisted value is the dark-mode UI preference
(`composables/useColorScheme.ts`) — no PII.

### Backend API contract

```
POST /auth/signup { email, password }          POST /auth/login       POST /auth/refresh
POST /auth/verify-email { email, code }        POST /auth/logout      GET  /auth/me
POST /auth/resend-email-otp { email }          POST /auth/forgot-password
POST /auth/reset-password { token, password }
```

Self-signup is **email + password only** and always creates a role `USER`
account; an admin promotes it to `MERCHANT` later via the console.

Client-side validation (`utils/validation.ts`) **mirrors** the backend rules
(email format, password: min 12 chars + lower/upper/number/symbol) for fast UX
feedback only. **The server is always the source of truth** and re-validates
everything.

---

## Talking to `rekados-backend`

- Set `NUXT_PUBLIC_API_BASE` to the backend's base URL (default
  `http://localhost:4004/api/v1`).
- The SPA calls the backend **directly** with credentialed requests (it does not
  proxy through Nitro), so the backend must send `Access-Control-Allow-Origin`
  for this app's origin **and** `Access-Control-Allow-Credentials: true`, and set
  cookies with `SameSite` appropriate to your deployment topology.
- Keep the CSP `connect-src` in `nuxt.config.ts` in sync with
  `NUXT_PUBLIC_API_BASE`.

### Backend TODOs surfaced by this app

- **Merchant profile / role**: self-signup (`POST /auth/signup`) is email +
  password only and creates a role `USER`. Merchant promotion is done by an
  admin. Store-profile fields (business name, address, …) are collected in the
  UI but stored **locally** until a dedicated merchant-profile endpoint (e.g.
  `POST /merchants`) exists — a **backend TODO**.
- **Merchant data endpoints** (catalog, orders, profile, dashboard) are mocked
  client-side; see `TODO(backend)` comments for the expected REST routes.

---

## Security notes

- `nuxt-security` sets a strict **CSP** (nonce-based scripts, `frame-ancestors
  'none'`), **HSTS** (2 years, includeSubDomains, preload), `X-Frame-Options:
  DENY`, `nosniff`, a locked-down `Permissions-Policy`, cross-origin isolation
  headers, request-size limiting and rate limiting.
- No secrets in the repo. Tokens never touch JS or `localStorage`.
- `.env` is gitignored; only `.env.example` is committed.
- The Dockerfile runs as the non-root `node` user.

---

## Setup

Requires **Node 20+**.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit NUXT_PUBLIC_API_BASE if your backend is elsewhere

# 3. Run the dev server (http://localhost:3005)
npm run dev
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on **port 3005** |
| `npm run build` | Production build (Nitro server output) |
| `npm run preview` | Preview the production build |
| `npm run generate` | Static generation |
| `npm run lint` | ESLint |

### Docker

```bash
docker build -t rekados-merchant .
docker run -p 3005:3005 -e NUXT_PUBLIC_API_BASE=https://api.example.com/api/v1 rekados-merchant
```

The container starts the Nitro server with `node .output/server/index.mjs` on port
3005.

---

## Project structure

```
assets/css/tailwind.css     Tailwind entry + base/component styles
components/                 AppHeader, AppSidebar, AuthCard, Button, DataTable,
                            FormError, Modal, PasswordField, StatCard,
                            StatusBadge, TextField
composables/useApi.ts       Credentialed fetch wrapper w/ refresh-and-retry
composables/useColorScheme  Dark-mode toggle (UI pref only)
layouts/                    default (public), app (authenticated shell)
middleware/auth.ts          Session + MERCHANT-role guard
pages/                      Landing, auth pages, /app/* merchant area
stores/                     auth (real), catalog + orders (mock)
utils/validation.ts         Client validation mirroring backend rules
nuxt.config.ts              Modules, runtimeConfig, nuxt-security config
```
