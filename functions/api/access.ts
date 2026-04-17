/**
 * Cloudflare Pages Function — /api/access
 *
 * Handles passcode verification and R2 file delivery for the download portal.
 *
 * POST  — Verify passcode + Turnstile → issue HMAC-signed session cookie
 *   Body (JSON): { code, album_id, token }
 *
 * GET   — Serve R2 file authenticated by session cookie
 *   Query: file (R2 key), dl=1 (Content-Disposition: attachment)
 *   Supports Range requests (206 Partial Content) for iOS/Safari streaming
 *   and download resume.
 */

interface Env {
  DB: D1Database
  R2_BUCKET: R2Bucket
  TURNSTILE_SECRET_KEY: string
  STREAM_SECRET: string
}

interface RequestBody {
  code?: string
  album_id?: string
  token?: string
}

interface PasscodeRow {
  code: string
  album_id: string
  issued_at: number
  valid_duration: number
  is_suspended: number
}

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(
  body: Record<string, unknown>,
  status = 200,
  extra?: HeadersInit
): Response {
  const headers = new Headers(extra)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(body), { status, headers })
}

function isSafePath(path: string): boolean {
  if (path.includes('..')) return false
  try {
    const decoded = decodeURIComponent(path)
    return !decoded.split('/').some((seg) => seg === '..')
  } catch {
    return false
  }
}

async function verifyTurnstile(
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
// Session cookie helpers (HMAC-signed, HttpOnly)
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'portal_session'
/** Default session lifetime — 24 hours (capped to passcode validity). */
const SESSION_MAX_AGE = 86400

interface SessionPayload {
  /** album_id */
  a: string
  /** passcode */
  c: string
  /** expiry (unix seconds) */
  e: number
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  const padded =
    str.replace(/-/g, '+').replace(/_/g, '/') +
    '=='.slice(0, (4 - (str.length % 4)) % 4)
  return atob(padded)
}

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

async function createSessionCookie(
  albumId: string,
  code: string,
  maxAge: number,
  secret: string
): Promise<string> {
  const payload: SessionPayload = {
    a: albumId,
    c: code,
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
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ].join('; ')
}

async function verifySessionCookie(
  cookieHeader: string | null,
  secret: string
): Promise<SessionPayload | null> {
  if (!cookieHeader) return null

  // Parse cookie header to find our cookie
  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const target = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (!target) return null

  const value = target.slice(COOKIE_NAME.length + 1)
  const dotIdx = value.lastIndexOf('.')
  if (dotIdx < 0) return null

  const payloadB64 = value.slice(0, dotIdx)
  const sig = value.slice(dotIdx + 1)

  // Verify HMAC
  const expected = await hmacSign(payloadB64, secret)
  if (sig !== expected) return null

  // Decode payload
  try {
    const payloadJson = base64urlDecode(payloadB64)
    const payload = JSON.parse(payloadJson) as SessionPayload

    // Check expiry
    const now = Math.floor(Date.now() / 1000)
    if (now > payload.e) return null

    return payload
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Range request helpers
// ---------------------------------------------------------------------------

interface ParsedRange {
  offset: number
  length: number
}

function parseRangeHeader(
  header: string,
  totalSize: number
): ParsedRange | null {
  const match = header.match(/bytes=(\d*)-(\d*)/)
  if (!match) return null

  const [, startStr, endStr] = match

  if (startStr === '' && endStr === '') return null

  let offset: number
  let end: number

  if (startStr === '') {
    // Suffix range: bytes=-500
    const suffix = parseInt(endStr, 10)
    offset = Math.max(0, totalSize - suffix)
    end = totalSize - 1
  } else {
    offset = parseInt(startStr, 10)
    if (offset >= totalSize) return null
    end =
      endStr !== ''
        ? Math.min(parseInt(endStr, 10), totalSize - 1)
        : totalSize - 1
  }

  return { offset, length: end - offset + 1 }
}

// ---------------------------------------------------------------------------
// POST handler — passcode verification + session cookie issuance
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // ---- Parse body ----------------------------------------------------------
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return json(
      {
        error:
          'リクエストの処理に失敗しました。お手数ですが、ページを再読み込みして再度お試しください。',
      },
      400
    )
  }

  const { code, album_id, token } = body
  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'

  if (!code || !album_id || !token) {
    return json(
      {
        error:
          '必要な情報が不足しています。ページを再読み込みして再度お試しください。',
      },
      400
    )
  }

  // ---- Turnstile verification ----------------------------------------------
  const turnstileOk = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY)
  if (!turnstileOk) {
    return json(
      {
        error:
          'セキュリティ確認に失敗しました。ページを再読み込みして再度お試しください。解決しない場合は、パスコードカード記載の連絡先までお問い合わせください。',
      },
      403
    )
  }

  // ---- Passcode lookup -----------------------------------------------------
  const row = await env.DB.prepare('SELECT * FROM passcodes WHERE code = ?')
    .bind(code)
    .first<PasscodeRow>()

  // Merge "not found" and "wrong album" into one generic message to prevent
  // attackers from discovering whether a code exists or which album it targets.
  if (!row || row.album_id !== album_id) {
    return json(
      {
        error:
          'パスコードが正しくありません。入力内容をご確認のうえ、もう一度お試しください。',
      },
      403
    )
  }

  if (row.is_suspended) {
    return json(
      {
        error:
          'このパスコードは現在ご利用いただけません。お心当たりがない場合は、パスコードカード記載の連絡先までお問い合わせください。',
      },
      403
    )
  }

  // Check expiry (valid_duration 0 = never expires)
  const now = Math.floor(Date.now() / 1000)
  if (row.valid_duration > 0) {
    if (now > row.issued_at + row.valid_duration) {
      return json(
        {
          error:
            'このパスコードはご利用いただけません。有効期限が切れている可能性があります。新しいパスコードが必要な場合は、パスコードカード記載の連絡先までお問い合わせください。',
        },
        403
      )
    }
  }

  // ---- IP Tracking (Two-Tier Limit) ----------------------------------------
  // Read-only check — is this IP already known for this code?
  const existingIp = await env.DB.prepare(
    'SELECT 1 FROM ip_tracking WHERE code = ? AND ip = ?'
  )
    .bind(code, ip)
    .first()

  if (!existingIp) {
    // Count distinct IPs for this code
    const countResult = await env.DB.prepare(
      'SELECT COUNT(DISTINCT ip) AS cnt FROM ip_tracking WHERE code = ?'
    )
      .bind(code)
      .first<{ cnt: number }>()

    const distinctIps = countResult?.cnt ?? 0

    // Tier 1: Hard cap — auto-suspend
    if (distinctIps >= 15) {
      await env.DB.prepare(
        'UPDATE passcodes SET is_suspended = 1 WHERE code = ?'
      )
        .bind(code)
        .run()

      return json(
        {
          error:
            '利用状況を確認した結果、このパスコードは現在ご利用いただけません。お心当たりがない場合は、パスコードカード記載の連絡先までお問い合わせください。',
        },
        403
      )
    }

    // Tier 2: Soft cap — reject but do not suspend
    if (distinctIps >= 5) {
      return json(
        {
          error:
            'このパスコードは現在、別の環境で利用中の可能性があります。しばらく時間をおいてから再度お試しください。',
        },
        429
      )
    }
  }

  // Atomic UPSERT for IP tracking — avoids race-condition unique constraint
  // violations when concurrent requests arrive from the same new IP.
  context.waitUntil(
    (async () => {
      await env.DB.prepare(
        `INSERT INTO ip_tracking (code, ip, first_seen, last_seen)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(code, ip) DO UPDATE SET last_seen = excluded.last_seen`
      )
        .bind(code, ip, now, now)
        .run()

      // Prune IPs older than 6 hours (rolling window)
      await env.DB.prepare('DELETE FROM ip_tracking WHERE last_seen < ?')
        .bind(now - 21600)
        .run()
    })()
  )

  // ---- Issue session cookie ------------------------------------------------
  // Cap session lifetime to passcode validity (if set) or 24 h.
  let sessionAge = SESSION_MAX_AGE
  if (row.valid_duration > 0) {
    const remaining = row.issued_at + row.valid_duration - now
    sessionAge = Math.min(SESSION_MAX_AGE, Math.max(remaining, 0))
  }

  const cookie = await createSessionCookie(
    album_id,
    code,
    sessionAge,
    env.STREAM_SECRET
  )

  return json({ message: 'アクセスが承認されました' }, 200, {
    'Set-Cookie': cookie,
  })
}

// ---------------------------------------------------------------------------
// GET handler — cookie-authenticated file delivery with Range support
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  const file = url.searchParams.get('file')
  const dl = url.searchParams.get('dl') === '1'

  if (!file) {
    return json(
      {
        error: '必要な情報が不足しています。ページを再読み込みしてください。',
      },
      400
    )
  }

  if (!isSafePath(file)) {
    return json(
      {
        error:
          '無効なファイル指定です。ページを再読み込みして再度お試しください。',
      },
      403
    )
  }

  // ---- Verify session cookie -----------------------------------------------
  const session = await verifySessionCookie(
    request.headers.get('Cookie'),
    env.STREAM_SECRET
  )

  if (!session) {
    return json(
      {
        error:
          'セッションが無効です。ページを再読み込みして再度パスコードを入力してください。',
      },
      401
    )
  }

  // File must be scoped under the authenticated album
  if (!file.startsWith(`${session.a}/`)) {
    return json({ error: 'アクセス権がありません。' }, 403)
  }

  // ---- Build common response headers ---------------------------------------
  const rangeHeader = request.headers.get('Range')
  const headers = new Headers()
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=300')

  const basename = file.split('/').pop() ?? 'download'
  headers.set(
    'Content-Disposition',
    dl
      ? `attachment; filename="${encodeURIComponent(basename)}"`
      : `inline; filename="${encodeURIComponent(basename)}"`
  )

  // ---- Range request (206 Partial Content) ---------------------------------
  if (rangeHeader) {
    // HEAD to get full object size for Content-Range calculation
    const headObj = await env.R2_BUCKET.head(file)
    if (!headObj) {
      return json({ error: '指定されたファイルが見つかりません。' }, 404)
    }

    const totalSize = headObj.size
    const range = parseRangeHeader(rangeHeader, totalSize)

    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      })
    }

    const object = await env.R2_BUCKET.get(file, {
      range: { offset: range.offset, length: range.length },
    })
    if (!object) {
      return json({ error: '指定されたファイルが見つかりません。' }, 404)
    }

    // Content-Type from R2 metadata — not hardcoded
    headers.set(
      'Content-Type',
      headObj.httpMetadata?.contentType ?? 'application/octet-stream'
    )
    const endByte = range.offset + range.length - 1
    headers.set(
      'Content-Range',
      `bytes ${range.offset}-${endByte}/${totalSize}`
    )
    headers.set('Content-Length', String(range.length))

    return new Response(object.body as ReadableStream, {
      status: 206,
      headers,
    })
  }

  // ---- Full response (no Range) --------------------------------------------
  const object = await env.R2_BUCKET.get(file)
  if (!object) {
    return json({ error: '指定されたファイルが見つかりません。' }, 404)
  }

  // Content-Type from R2 metadata — not hardcoded
  headers.set(
    'Content-Type',
    object.httpMetadata?.contentType ?? 'application/octet-stream'
  )
  if (object.size !== undefined) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body as ReadableStream, { status: 200, headers })
}
