/**
 * Cloudflare Pages Function — /api/access
 *
 * Handles passcode verification and R2 file delivery for the download portal.
 *
 * Body (JSON):
 *   code       – passcode string
 *   album_id   – album identifier
 *   filename?  – R2 object key (omit for verify-only mode)
 *   token      – Cloudflare Turnstile token
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
  filename?: string
  token?: string
  action?: 'verify' | 'download' | 'stream'
}

interface PasscodeRow {
  code: string
  album_id: string
  issued_at: number
  valid_duration: number
  is_suspended: number
}

interface IpRow {
  code: string
  ip: string
  first_seen: number
  last_seen: number
}

interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function signString(text: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text))
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function isSafePath(path: string): boolean {
  if (path.includes('..')) {
    return false
  }

  try {
    const decoded = decodeURIComponent(path)
    return !decoded.split('/').some((segment) => segment === '..')
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
// Handler
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
          'リクエストの形式が正しくありません。ページを再読み込みしてもう一度お試しください。',
      },
      400
    )
  }

  const {
    code,
    album_id,
    filename,
    token,
    action = filename ? 'download' : 'verify',
  } = body
  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0'

  if (!code || !album_id || !token) {
    return json(
      {
        error:
          '必要な情報が不足しています。ページを再読み込みしてもう一度お試しください。',
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
          'セキュリティ検証に失敗しました。ページを再読み込みして再度お試しください。解決しない場合はパスコードカードに記載の連絡先までお問い合わせください。',
      },
      403
    )
  }

  // ---- Passcode lookup -----------------------------------------------------
  const row = await env.DB.prepare('SELECT * FROM passcodes WHERE code = ?')
    .bind(code)
    .first<PasscodeRow>()

  if (!row) {
    return json(
      {
        error:
          'パスコードが見つかりませんでした。入力内容をご確認のうえ、もう一度お試しください。',
      },
      404
    )
  }

  if (row.is_suspended) {
    return json(
      {
        error:
          'このパスコードは無効化されています。お心当たりがない場合は、パスコードカードに記載の連絡先までお問い合わせください。',
      },
      403
    )
  }

  // Check album match
  if (row.album_id !== album_id) {
    return json(
      {
        error:
          'このパスコードは別のアルバム用です。正しいダウンロードページをご確認ください。',
      },
      403
    )
  }

  // Check expiry (valid_duration 0 = never expires)
  if (row.valid_duration > 0) {
    const now = Math.floor(Date.now() / 1000)
    if (now > row.issued_at + row.valid_duration) {
      return json(
        {
          error:
            'このパスコードの有効期限が切れています。新しいパスコードが必要な場合は、パスコードカードに記載の連絡先までお問い合わせください。',
        },
        403
      )
    }
  }

  // ---- IP Tracking (Two-Tier Limit) ----------------------------------------
  const existingIp = await env.DB.prepare(
    'SELECT * FROM ip_tracking WHERE code = ? AND ip = ?'
  )
    .bind(code, ip)
    .first<IpRow>()

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
            '利用端末数が上限を超えたため、このパスコードは自動的に無効化されました。お心当たりがない場合は、パスコードカードに記載の連絡先までお問い合わせください。',
        },
        403
      )
    }

    // Tier 2: Soft cap — reject but do not suspend
    if (distinctIps >= 3) {
      return json(
        {
          error:
            '登録済み端末の上限に達しました。以前ご利用になった端末からアクセスするか、24時間後、もう一度お試しください。',
        },
        429
      )
    }
  }

  // Async IP upsert + rolling window cleanup (non-blocking)
  const now = Math.floor(Date.now() / 1000)
  context.waitUntil(
    (async () => {
      if (existingIp) {
        await env.DB.prepare(
          'UPDATE ip_tracking SET last_seen = ? WHERE code = ? AND ip = ?'
        )
          .bind(now, code, ip)
          .run()
      } else {
        await env.DB.prepare(
          'INSERT INTO ip_tracking (code, ip, first_seen, last_seen) VALUES (?, ?, ?, ?)'
        )
          .bind(code, ip, now, now)
          .run()
      }
      // Prune IPs older than 24 hours
      await env.DB.prepare('DELETE FROM ip_tracking WHERE last_seen < ?')
        .bind(now - 86400)
        .run()
    })()
  )

  // ---- Action: verify ------------------------------------------------------
  if (action === 'verify' || !filename) {
    return json({ message: 'アクセスが承認されました' }, 200)
  }

  // Security: filename must be scoped under the album and must not allow traversal
  if (!filename.startsWith(`${album_id}/`) || !isSafePath(filename)) {
    return json(
      {
        error:
          '不正なファイルパスです。ページを再読み込みしてもう一度お試しください。',
      },
      403
    )
  }

  // ---- Action: stream (generate signed ticket URL) -------------------------
  if (action === 'stream') {
    const exp = now + 300 // 5-minute ticket
    const sig = await signString(`${filename}:${exp}`, env.STREAM_SECRET)
    return json({
      streamUrl: `/api/access?file=${encodeURIComponent(filename)}&exp=${exp}&sig=${sig}`,
    })
  }

  // ---- Action: download (binary file delivery) -----------------------------
  const object = await env.R2_BUCKET.get(filename)
  if (!object) {
    return json(
      {
        error: 'ファイルが見つかりませんでした。',
      },
      404
    )
  }

  const headers = new Headers()
  headers.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename.split('/').pop() ?? 'download')}"`
  )
  if (object.httpMetadata?.contentType) {
    headers.set('Content-Type', object.httpMetadata.contentType)
  } else {
    headers.set('Content-Type', 'application/octet-stream')
  }
  if (object.size !== undefined) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body as ReadableStream, { status: 200, headers })
}

// ---------------------------------------------------------------------------
// GET handler — stateless streaming ticket verification
// ---------------------------------------------------------------------------

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  const file = url.searchParams.get('file')
  const exp = url.searchParams.get('exp')
  const sig = url.searchParams.get('sig')

  if (!file || !exp || !sig) {
    return json(
      {
        error:
          'ストリーミングパラメータが不足しています。ページを再読み込みしてください。',
      },
      400
    )
  }

  if (!isSafePath(file)) {
    return json({ error: '不正なファイルパスです。' }, 403)
  }

  // Check expiration
  const expNum = Number(exp)
  const now = Math.floor(Date.now() / 1000)
  if (now > expNum) {
    return json(
      {
        error: 'ストリーミングチケットの有効期限が切れました。',
      },
      403
    )
  }

  // Verify signature
  const expected = await signString(`${file}:${exp}`, env.STREAM_SECRET)
  if (sig !== expected) {
    return json(
      {
        error: 'ストリーミング署名が無効です。ページを再読み込みしてください。',
      },
      403
    )
  }

  // Fetch from R2
  const object = await env.R2_BUCKET.get(file)
  if (!object) {
    return json(
      {
        error: 'ファイルが見つかりませんでした。',
      },
      404
    )
  }

  const headers = new Headers()
  headers.set('Content-Type', 'audio/mpeg')
  headers.set('Accept-Ranges', 'bytes')
  headers.set(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(file.split('/').pop() ?? 'audio')}"`
  )
  if (object.size !== undefined) {
    headers.set('Content-Length', String(object.size))
  }
  // Allow browser caching for the ticket duration
  headers.set('Cache-Control', 'private, max-age=300')

  return new Response(object.body as ReadableStream, { status: 200, headers })
}
