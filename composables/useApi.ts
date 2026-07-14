import type { FetchOptions } from 'ofetch'

/**
 * useApi — thin wrapper around $fetch for talking to rekados-backend.
 *
 * Auth model (shared across all Rekados web apps):
 *  - The backend issues httpOnly, secure, sameSite cookies for the access and
 *    refresh tokens. JS CANNOT read them (XSS-resistant), so we NEVER touch
 *    tokens here — we simply send cookies with `credentials: 'include'`.
 *  - On a 401 we attempt a single POST /auth/refresh (which rotates the cookies
 *    server-side) and retry the original request once. If it still fails, we
 *    redirect to /login.
 *
 * Base URL comes from runtimeConfig.public.apiBase (NUXT_PUBLIC_API_BASE).
 */

// Endpoints that must NOT trigger the refresh-and-retry loop.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register']

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

// Module-scoped so parallel 401s share a single in-flight refresh.
// (Not stored in useState — a pending Promise isn't SSR-serializable.)
let inflightRefresh: Promise<boolean> | null = null

export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  const tryRefresh = async (): Promise<boolean> => {
    if (inflightRefresh) return inflightRefresh
    inflightRefresh = (async () => {
      try {
        await $fetch('/auth/refresh', {
          baseURL,
          method: 'POST',
          credentials: 'include',
        })
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
    const opts: FetchOptions = {
      baseURL,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    }

    const skipRefresh = NO_REFRESH_PATHS.some((p) => path.startsWith(p))

    try {
      return (await $fetch<T>(path, opts as FetchOptions)) as T
    } catch (error: unknown) {
      const status = (error as { statusCode?: number; status?: number })?.statusCode
        ?? (error as { response?: { status?: number } })?.response?.status
        ?? 0
      const data = (error as { data?: unknown })?.data

      // Attempt refresh-and-retry exactly once for protected requests.
      if (status === 401 && !skipRefresh) {
        const refreshed = await tryRefresh()
        if (refreshed) {
          try {
            return (await $fetch<T>(path, opts as FetchOptions)) as T
          } catch (retryError: unknown) {
            const retryStatus = (retryError as { statusCode?: number })?.statusCode
              ?? (retryError as { response?: { status?: number } })?.response?.status
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
        // Refresh failed → session is gone.
        if (import.meta.client) await navigateTo('/login')
      }

      throw makeApiError(extractMessage(error) || 'Request failed', status, data)
    }
  }

  // Convenience verbs.
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

// Pull a human message out of a NestJS-style error payload.
function extractMessage(error: unknown): string {
  const data = (error as { data?: { message?: string | string[] } })?.data
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message
  }
  return (error as { message?: string })?.message || ''
}
