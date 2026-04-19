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

import { ERR } from './_errors'
import {
  json,
  isSafePath,
  verifyTurnstile,
  parseRange,
  resolveRange,
} from './_helpers'
import {
  createSessionCookie,
  verifySessionCookie,
  SESSION_MAX_AGE_S,
} from './_session'
import { checkIpLimit } from './_ip-tracking'
import { createRequestLogger } from './_logger'

// ---------------------------------------------------------------------------
// Env & D1 row types
// ---------------------------------------------------------------------------

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
  last_used: number
  usage_count: number
}

// ---------------------------------------------------------------------------
// POST handler — passcode verification + session cookie issuance
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const log = createRequestLogger(request)

  // ---- Parse body ----------------------------------------------------------
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return json({ error: ERR.BAD_JSON }, 400)
  }

  const { code, album_id, token } = body
  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'

  if (!code || !album_id || !token) {
    log.warn('missing fields', {
      hasCode: !!code,
      hasAlbum: !!album_id,
      hasToken: !!token,
    })
    return json({ error: ERR.MISSING_FIELDS }, 400)
  }

  // ---- Turnstile verification ----------------------------------------------
  const turnstileOk = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET_KEY)
  if (!turnstileOk) {
    log.warn('turnstile failed', { album: album_id })
    return json({ error: ERR.TURNSTILE_FAIL }, 403)
  }

  // ---- Passcode lookup -----------------------------------------------------
  const row = await env.DB.prepare('SELECT * FROM passcodes WHERE code = ?')
    .bind(code)
    .first<PasscodeRow>()

  // Merge "not found" and "wrong album" into one generic message to prevent
  // attackers from discovering whether a code exists or which album it targets.
  if (!row || row.album_id !== album_id) {
    log.warn('passcode invalid', { album: album_id })
    return json({ error: ERR.PASSCODE_INVALID }, 403)
  }

  if (row.is_suspended) {
    log.warn('passcode suspended', { album: album_id })
    return json({ error: ERR.PASSCODE_SUSPENDED }, 403)
  }

  // Check expiry (valid_duration 0 = never expires)
  const now = Math.floor(Date.now() / 1000)
  if (row.valid_duration > 0 && now > row.issued_at + row.valid_duration) {
    log.warn('passcode expired', { album: album_id })
    return json({ error: ERR.PASSCODE_EXPIRED }, 403)
  }

  // ---- IP tracking (two-tier rate limit) -----------------------------------
  const ipResult = await checkIpLimit(
    code,
    ip,
    now,
    env,
    context.waitUntil.bind(context)
  )
  if (!ipResult.ok) {
    log.warn('ip limit exceeded', { album: album_id })
    return ipResult.response
  }

  // ---- Issue session cookie ------------------------------------------------
  let sessionAge = SESSION_MAX_AGE_S
  if (row.valid_duration > 0) {
    const remaining = row.issued_at + row.valid_duration - now
    sessionAge = Math.min(SESSION_MAX_AGE_S, Math.max(remaining, 0))
  }

  // ---- Update usage stats (non-blocking) --------------------------------
  context.waitUntil(updateUsageStats(env.DB, code))

  const cookie = await createSessionCookie(
    album_id,
    sessionAge,
    env.STREAM_SECRET
  )
  log.info('session issued', { album: album_id, sessionAge })
  return json({ message: 'アクセスが承認されました' }, 200, {
    'Set-Cookie': cookie,
  })
}

// ---------------------------------------------------------------------------
// GET handler — cookie-authenticated file delivery with Range support
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const log = createRequestLogger(request)
  const url = new URL(request.url)

  const file = url.searchParams.get('file')
  const dl = url.searchParams.get('dl') === '1'

  if (!file) return json({ error: ERR.MISSING_FILE }, 400)
  if (!isSafePath(file)) {
    log.warn('unsafe path', { file })
    return json({ error: ERR.UNSAFE_PATH }, 403)
  }

  // ---- Verify session cookie -----------------------------------------------
  const session = await verifySessionCookie(
    request.headers.get('Cookie'),
    env.STREAM_SECRET
  )
  if (!session) {
    log.warn('invalid session cookie', { file })
    return json({ error: ERR.SESSION_INVALID }, 401)
  }

  // File must be scoped under the authenticated album
  if (!file.startsWith(`${session.a}/`)) {
    log.warn('album scope mismatch', { file, album: session.a })
    return json({ error: ERR.ACCESS_DENIED }, 403)
  }

  // ---- Build common response headers ---------------------------------------
  const headers = buildFileHeaders(file, dl)
  const rangeHeader = request.headers.get('Range')

  // ---- Range request (206 Partial Content) ---------------------------------
  if (rangeHeader) {
    return serveRangeRequest(env.R2_BUCKET, file, rangeHeader, headers)
  }

  // ---- Full response -------------------------------------------------------
  return serveFullFile(env.R2_BUCKET, file, headers)
}

// ---------------------------------------------------------------------------
// Usage stats helper
// ---------------------------------------------------------------------------

/**
 * Increment usage_count and set last_used timestamp for a passcode.
 * Runs via waitUntil so it never blocks the response.
 */
async function updateUsageStats(db: D1Database, code: string): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000)
    await db
      .prepare(
        'UPDATE passcodes SET usage_count = usage_count + 1, last_used = ? WHERE code = ?'
      )
      .bind(now, code)
      .run()
  } catch (err) {
    console.error('[access] usage stats update failed:', err)
  }
}

// ---------------------------------------------------------------------------
// File delivery helpers
// ---------------------------------------------------------------------------

/** Build the shared response headers for a file response. */
function buildFileHeaders(file: string, dl: boolean): Headers {
  const headers = new Headers()
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=300')
  headers.set('Vary', 'Range')

  const basename = file.split('/').pop() ?? 'download'
  const encodedName = encodeURIComponent(basename)
  const asciiFallback = basename.replace(/[^\x20-\x7E]/g, '_')
  const disposition = dl ? 'attachment' : 'inline'
  headers.set(
    'Content-Disposition',
    `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
  )

  return headers
}

/** Serve a Range request (206 Partial Content). */
async function serveRangeRequest(
  bucket: R2Bucket,
  file: string,
  rangeHeader: string,
  headers: Headers
): Promise<Response> {
  const range = parseRange(rangeHeader)
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': 'bytes */*' },
    })
  }

  const object = await bucket.get(file, { range })
  if (!object) return json({ error: ERR.FILE_NOT_FOUND }, 404)

  const totalSize = object.size
  const resolved = resolveRange(range, totalSize)
  if (!resolved) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${totalSize}` },
    })
  }

  headers.set(
    'Content-Type',
    object.httpMetadata?.contentType ?? 'application/octet-stream'
  )
  const contentLength = resolved.end - resolved.start + 1
  headers.set(
    'Content-Range',
    `bytes ${resolved.start}-${resolved.end}/${totalSize}`
  )
  headers.set('Content-Length', String(contentLength))

  return new Response(object.body as ReadableStream, { status: 206, headers })
}

/** Serve a full (non-Range) file response. */
async function serveFullFile(
  bucket: R2Bucket,
  file: string,
  headers: Headers
): Promise<Response> {
  const object = await bucket.get(file)
  if (!object) return json({ error: ERR.FILE_NOT_FOUND }, 404)

  headers.set(
    'Content-Type',
    object.httpMetadata?.contentType ?? 'application/octet-stream'
  )
  if (object.size !== undefined) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body as ReadableStream, { status: 200, headers })
}
