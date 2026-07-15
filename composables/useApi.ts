import type { FetchOptions } from 'ofetch'
import { encryptedFetch } from './useCrypto'

/**
 * useApi — wrapper around the E2E-encrypted transport for talking to
 * rekados-backend.
 *
 * Auth model (shared across all Rekados web apps):
 *  - The backend issues httpOnly, secure, sameSite cookies for the access and
 *    refresh tokens. JS CANNOT read them (XSS-resistant), so we NEVER touch
 *    tokens here — we simply send cookies with `credentials: 'include'`.
 *  - Every request/response body is E2E-encrypted (see useCrypto / backend).
 *  - On a 401 we attempt a single POST /auth/refresh (rotates the cookies) and
 *    retry the original request once. If it still fails, we redirect to /login.
 *
 * Base URL comes from runtimeConfig.public.apiBase (NUXT_PUBLIC_API_BASE).
 */

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register', '/auth/signup', '/auth/verify-email']

export interface ApiError extends Error {
  statusCode: number
  data?: unknown
}

const makeApiError = (message: string, statusCode: number, data?: unknown): ApiError => {
  const err = new Error(message) as ApiError
  err.statusCode = statusCode
  err.data = data
  return err
}

let inflightRefresh: Promise<boolean> | null = null

export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase as string
  // Active branch for the merchant console. Sent as X-Branch-Id so the backend
  // scopes every query to that branch (main sees all, sub is locked to its own).
  const activeBranch = useCookie<string | null>('rk_active_branch', { sameSite: 'lax', path: '/' })

  const tryRefresh = async (): Promise<boolean> => {
    if (inflightRefresh) return inflightRefresh
    inflightRefresh = (async () => {
      try {
        await encryptedFetch(baseURL, '/auth/refresh', { method: 'POST', credentials: 'include' })
        return true
      } catch {
        return false
      } finally {
        inflightRefresh = null
      }
    })()
    return inflightRefresh
  }

  const request = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
    const branchHeader =
      activeBranch.value ? { 'X-Branch-Id': activeBranch.value } : {}
    const send = () =>
      encryptedFetch<T>(baseURL, path, {
        method: (options.method as string) || 'GET',
        body: (options as { body?: unknown }).body,
        headers: { ...branchHeader, ...(options.headers as Record<string, string> | undefined) },
        credentials: 'include',
      })

    const skipRefresh = NO_REFRESH_PATHS.some((p) => path.startsWith(p))

    try {
      return await send()
    } catch (error: unknown) {
      const status = (error as { statusCode?: number; status?: number })?.statusCode
        ?? (error as { status?: number })?.status
        ?? (error as { response?: { status?: number } })?.response?.status
        ?? 0
      const data = (error as { data?: unknown })?.data

      if (status === 401 && !skipRefresh) {
        const refreshed = await tryRefresh()
        if (refreshed) {
          try {
            return await send()
          } catch (retryError: unknown) {
            const retryStatus = (retryError as { statusCode?: number; status?: number })?.statusCode
              ?? (retryError as { status?: number })?.status
              ?? 0
            if (retryStatus === 401 && import.meta.client) {
              await navigateTo('/login')
            }
            throw makeApiError(
              extractMessage(retryError) || 'Request failed',
              retryStatus,
              (retryError as { data?: unknown })?.data,
            )
          }
        }
        if (import.meta.client) await navigateTo('/login')
      }

      throw makeApiError(extractMessage(error) || 'Request failed', status, data)
    }
  }

  const get = <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'GET' })
  const post = <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'POST', body: body as Record<string, unknown> })
  const put = <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: body as Record<string, unknown> })
  const patch = <T>(path: string, body?: unknown, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: body as Record<string, unknown> })
  const del = <T>(path: string, options?: FetchOptions) =>
    request<T>(path, { ...options, method: 'DELETE' })

  return { request, get, post, put, patch, del, baseURL }
}

/**
 * Turns any thrown fetch error into a friendly, human-readable message.
 * Prefers the backend's own message, then a friendly message mapped from the
 * HTTP status, then a connection message — never ofetch's raw
 * `[POST] "/api/..": 400` string.
 */
function extractMessage(error: unknown): string {
  const e = error as {
    data?: { message?: string | string[]; error?: string }
    statusCode?: number
    status?: number
    response?: { status?: number }
    message?: string
  }
  const data = e?.data
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message
  }
  if (data?.error && !/^\d+$/.test(String(data.error))) return data.error

  const status = e?.response?.status ?? e?.statusCode ?? e?.status
  const byStatus: Record<number, string> = {
    400: 'Some details look off. Please check and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: "You don't have permission to do that.",
    404: "We couldn't find what you were looking for.",
    408: 'The request timed out. Please try again.',
    409: 'That conflicts with the current state. Please refresh and try again.',
    413: 'That request is too large.',
    422: 'Some details look off. Please check and try again.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Something went wrong on our end. Please try again shortly.',
    502: 'The service is temporarily unavailable. Please try again shortly.',
    503: 'The service is temporarily unavailable. Please try again shortly.',
    504: 'The service is temporarily unavailable. Please try again shortly.',
  }
  if (status && byStatus[status]) return byStatus[status]

  const msg = e?.message
  const isRaw =
    !msg ||
    /^\[\w+\]\s+".*":/.test(msg) ||
    /fetch failed|failed to fetch|networkerror|load failed/i.test(msg)
  if (isRaw) return "We couldn't reach the server. Please check your connection and try again."
  return msg
}
