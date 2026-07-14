import { x25519 } from '@noble/curves/ed25519'

/**
 * Client half of Rekados' end-to-end payload encryption (see backend README).
 *
 * Hybrid X25519 ECDH -> HKDF-SHA256 -> AES-256-GCM, per-request forward secrecy.
 * Isomorphic: uses @noble/curves for X25519 and Web Crypto (available in the
 * browser AND Node 20 SSR) for HKDF + AES-GCM, so it works during SSR too.
 *
 * The server's static public key is fetched once from GET /crypto/public-key
 * (the only plaintext endpoint besides /health) and cached per runtime.
 */

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  globalThis.crypto.getRandomValues(b)
  return b
}

function toB64(u: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < u.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(u.subarray(i, i + chunk)))
  }
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data))
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: string): Promise<CryptoKey> {
  const base = await globalThis.crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: textEncoder.encode(info) },
    base,
    256,
  )
  return globalThis.crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

interface Session {
  epkB64: string
  reqKey: CryptoKey
  resKey: CryptoKey
}

export interface RequestEnvelope {
  epk: string
  iv: string
  ct: string
  tag: string
  ts: number
  nonce: string
}

function isResponseEnvelope(x: unknown): x is { iv: string; ct: string; tag: string } {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as Record<string, unknown>).iv === 'string' &&
    typeof (x as Record<string, unknown>).ct === 'string' &&
    typeof (x as Record<string, unknown>).tag === 'string'
  )
}

// Cached server public key (base64), shared across calls in this runtime.
let serverPubB64: string | null = null
let pubInFlight: Promise<string> | null = null

async function getServerPub(apiBase: string, force = false): Promise<string> {
  if (serverPubB64 && !force) return serverPubB64
  if (!pubInFlight) {
    pubInFlight = $fetch<{ publicKey: string }>('/crypto/public-key', { baseURL: apiBase })
      .then((r) => {
        serverPubB64 = r.publicKey
        return serverPubB64
      })
      .finally(() => {
        setTimeout(() => (pubInFlight = null), 0)
      })
  }
  return pubInFlight
}

async function deriveSession(serverPub64: string): Promise<Session> {
  const serverPub = fromB64(serverPub64)
  const ephPriv = randomBytes(32)
  const epk = x25519.getPublicKey(ephPriv)
  const shared = x25519.getSharedSecret(ephPriv, serverPub)
  const salt = await sha256(new Uint8Array([...epk, ...serverPub]))
  const [reqKey, resKey] = await Promise.all([
    hkdf(shared, salt, 'rekados/req/v1'),
    hkdf(shared, salt, 'rekados/res/v1'),
  ])
  return { epkB64: toB64(epk), reqKey, resKey }
}

async function sealBody(session: Session, body: unknown): Promise<RequestEnvelope> {
  const iv = randomBytes(12)
  const ts = Date.now()
  const nonce = toB64(randomBytes(16))
  const aad = textEncoder.encode(`${session.epkB64}.${ts}.${nonce}`)
  const combined = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad },
      session.reqKey,
      textEncoder.encode(JSON.stringify(body)),
    ),
  )
  const ct = combined.subarray(0, combined.length - 16)
  const tag = combined.subarray(combined.length - 16)
  return { epk: session.epkB64, iv: toB64(iv), ct: toB64(ct), tag: toB64(tag), ts, nonce }
}

async function openResponse(
  resKey: CryptoKey,
  env: { iv: string; ct: string; tag: string },
): Promise<unknown> {
  const iv = fromB64(env.iv)
  const ct = fromB64(env.ct)
  const tag = fromB64(env.tag)
  const combined = new Uint8Array(ct.length + tag.length)
  combined.set(ct)
  combined.set(tag, ct.length)
  const pt = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: textEncoder.encode('rekados/res/v1') },
    resKey,
    combined,
  )
  return JSON.parse(textDecoder.decode(pt))
}

export interface EncryptedFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

/**
 * Performs one encrypted round-trip: seals the body (if any), sends the
 * ephemeral public key, and decrypts the response. Encrypted error bodies are
 * decrypted and re-attached to the thrown error's `data` so existing error
 * handling keeps working.
 */
export async function encryptedFetch<T = unknown>(
  apiBase: string,
  path: string,
  opts: EncryptedFetchOptions = {},
): Promise<T> {
  const serverPub = await getServerPub(apiBase)
  const session = await deriveSession(serverPub)

  const headers: Record<string, string> = { ...(opts.headers ?? {}), 'X-Enc-Epk': session.epkB64 }
  let body: unknown = undefined
  if (opts.body !== undefined && opts.body !== null) {
    body = await sealBody(session, opts.body)
  }

  try {
    const res = await $fetch<unknown>(path, {
      baseURL: apiBase,
      method: (opts.method as never) ?? (body ? 'POST' : 'GET'),
      credentials: opts.credentials ?? 'include',
      headers,
      body: body as never,
    })
    if (isResponseEnvelope(res)) {
      return (await openResponse(session.resKey, res)) as T
    }
    return res as T
  } catch (err: unknown) {
    const data = (err as { data?: unknown })?.data
    if (isResponseEnvelope(data)) {
      try {
        ;(err as { data?: unknown }).data = await openResponse(session.resKey, data)
      } catch {
        // If we can't decrypt, the server key may have rotated — refresh it.
        serverPubB64 = null
      }
    }
    throw err
  }
}

export function useCrypto() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string
  return {
    /** Warm the server public-key cache (optional; called lazily otherwise). */
    prime: () => getServerPub(apiBase),
    encryptedFetch: <T = unknown>(path: string, opts?: EncryptedFetchOptions) =>
      encryptedFetch<T>(apiBase, path, opts),
  }
}
