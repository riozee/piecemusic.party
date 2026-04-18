/**
 * HMAC-signed session cookie helpers for /api/access.
 *
 * The session is a compact JSON payload (`{ a: albumId, e: expiry }`)
 * signed with HMAC-SHA256.  Stored as an HttpOnly, Secure, SameSite=Strict
 * cookie scoped to `/api/access`.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const COOKIE_NAME = 'portal_session'

/** Default session lifetime — 24 hours (capped to passcode validity). */
export const SESSION_MAX_AGE_S = 86400

// ---------------------------------------------------------------------------
// Session payload shape
// ---------------------------------------------------------------------------

export interface SessionPayload {
  /** album_id the session is scoped to */
  a: string
  /** expiry – unix seconds */
  e: number
}

// ---------------------------------------------------------------------------
// Base64-URL encoding / decoding
// ---------------------------------------------------------------------------

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  const padded =
    str.replace(/-/g, '+').replace(/_/g, '/') +
    '=='.slice(0, (4 - (str.length % 4)) % 4)
  return atob(padded)
}

// ---------------------------------------------------------------------------
// HMAC helpers
// ---------------------------------------------------------------------------

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time string comparison via double-HMAC.
 * Prevents timing side-channels when verifying HMAC signatures.
 *
 * Both inputs are always HMAC'd regardless of length to avoid leaking
 * whether the supplied signature is the correct length.
 */
async function timingSafeCompare(
  a: string,
  b: string,
  secret: string
): Promise<boolean> {
  const [ha, hb] = await Promise.all([hmacSign(a, secret), hmacSign(b, secret)])
  // ha and hb are fixed-length hex strings — safe to compare directly.
  // The length check is done AFTER hashing to avoid timing leaks.
  if (ha.length !== hb.length) return false
  let result = 0
  for (let i = 0; i < ha.length; i++) {
    result |= ha.charCodeAt(i) ^ hb.charCodeAt(i)
  }
  return result === 0
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an HMAC-signed `Set-Cookie` header value.
 *
 * @param albumId  Album the session grants access to.
 * @param maxAge   Lifetime in seconds.
 * @param secret   HMAC secret (STREAM_SECRET env var).
 */
export async function createSessionCookie(
  albumId: string,
  maxAge: number,
  secret: string
): Promise<string> {
  const payload: SessionPayload = {
    a: albumId,
    e: Math.floor(Date.now() / 1000) + maxAge,
  }
  const enc = new TextEncoder()
  const encoded = enc.encode(JSON.stringify(payload))
  const payloadB64 = base64url(encoded.buffer as ArrayBuffer)
  const sig = await hmacSign(payloadB64, secret)
  const value = `${payloadB64}.${sig}`

  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/api/access',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ].join('; ')
}

/**
 * Parse and verify a session cookie from the `Cookie` header.
 *
 * @returns The decoded payload if the cookie is valid and not expired,
 *          or `null` otherwise.
 */
export async function verifySessionCookie(
  cookieHeader: string | null,
  secret: string
): Promise<SessionPayload | null> {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const target = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (!target) return null

  const value = target.slice(COOKIE_NAME.length + 1)
  const dotIdx = value.lastIndexOf('.')
  if (dotIdx < 0) return null

  const payloadB64 = value.slice(0, dotIdx)
  const sig = value.slice(dotIdx + 1)

  const expected = await hmacSign(payloadB64, secret)
  const valid = await timingSafeCompare(sig, expected, secret)
  if (!valid) return null

  try {
    const payloadJson = base64urlDecode(payloadB64)
    const payload = JSON.parse(payloadJson) as SessionPayload

    const now = Math.floor(Date.now() / 1000)
    if (now > payload.e) return null

    return payload
  } catch {
    return null
  }
}
