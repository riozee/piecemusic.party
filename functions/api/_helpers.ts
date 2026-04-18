/**
 * Shared utility functions for /api/access handlers.
 */

// ---------------------------------------------------------------------------
// JSON response helper
// ---------------------------------------------------------------------------

/** Return a JSON response with optional extra headers. */
export function json(
  body: Record<string, unknown>,
  status = 200,
  extra?: HeadersInit
): Response {
  const headers = new Headers(extra)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { status, headers })
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

/**
 * Validate that an R2 key is safe to serve.
 *
 * Blocks null bytes, absolute paths, backslashes, and directory-traversal
 * segments (`..`, `.`) – including double/triple percent-encoded variants.
 */
export function isSafePath(path: string): boolean {
  if (path.includes('\0') || path.includes('%00')) return false
  if (path.startsWith('/') || path.includes('\\')) return false

  // Iteratively decode to catch double/triple percent-encoding attacks
  let decoded = path
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    } catch {
      return false
    }
  }

  return !decoded.split('/').some((seg) => seg === '..' || seg === '.')
}

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
}

/** Verify a Cloudflare Turnstile token server-side. */
export async function verifyTurnstile(
  token: string,
  ip: string,
  secret: string
): Promise<boolean> {
  const form = new URLSearchParams()
  form.append('secret', secret)
  form.append('response', token)
  form.append('remoteip', ip)

  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body: form }
  )
  const data = (await res.json()) as TurnstileResponse
  return data.success
}

// ---------------------------------------------------------------------------
// Range request helpers (for R2 file streaming)
// ---------------------------------------------------------------------------

/**
 * Parsed representation of a `Range` header that can be passed directly
 * to `R2Bucket.get()`.
 */
export type ParsedRange =
  | { offset: number; length: number }
  | { offset: number }
  | { suffix: number }

/** Parse a `Range: bytes=X-Y` header into an R2-compatible descriptor. */
export function parseRange(header: string): ParsedRange | null {
  const match = header.match(/bytes=(\d*)-(\d*)/)
  if (!match) return null

  const [, startStr, endStr] = match
  if (startStr === '' && endStr === '') return null

  if (startStr === '') {
    return { suffix: parseInt(endStr, 10) }
  }

  const offset = parseInt(startStr, 10)
  if (endStr === '') {
    return { offset }
  }

  const end = parseInt(endStr, 10)
  return { offset, length: end - offset + 1 }
}

/**
 * Resolve a parsed range against a known total size.
 * Returns the concrete `{ start, end }` byte range for `Content-Range`.
 */
export function resolveRange(
  range: ParsedRange,
  totalSize: number
): { start: number; end: number } | null {
  if ('suffix' in range) {
    const start = Math.max(0, totalSize - range.suffix)
    return { start, end: totalSize - 1 }
  }

  const start = range.offset
  if (start >= totalSize) return null

  const end =
    'length' in range
      ? Math.min(start + range.length - 1, totalSize - 1)
      : totalSize - 1
  return { start, end }
}
