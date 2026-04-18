/**
 * Lightweight structured logger for Cloudflare Pages Functions.
 *
 * Outputs one JSON line per request to `console.log` / `console.error`.
 * Cloudflare Workers runtime forwards these to Workers Logs / Logpush
 * so they can be queried in the dashboard or streamed to external SIEM.
 *
 * Usage:
 *   const log = createRequestLogger(request)
 *   log.info('passcode verified', { album: 'chokaigi-collection' })
 *   log.warn('soft cap reached',  { ips: 6 })
 *   log.error('R2 fetch failed',  { file, status: 404 })
 */

export interface RequestLogger {
  info: (msg: string, extra?: Record<string, unknown>) => void
  warn: (msg: string, extra?: Record<string, unknown>) => void
  error: (msg: string, extra?: Record<string, unknown>) => void
}

/**
 * Create a logger scoped to a single request.
 *
 * Common fields (method, path, ip, ray) are attached automatically
 * so every log line can be correlated back to the originating request.
 */
export function createRequestLogger(request: Request): RequestLogger {
  const url = new URL(request.url)
  const base = {
    method: request.method,
    path: url.pathname,
    ip: request.headers.get('CF-Connecting-IP') ?? undefined,
    ray: request.headers.get('CF-Ray') ?? undefined,
  }

  function emit(
    level: 'info' | 'warn' | 'error',
    msg: string,
    extra?: Record<string, unknown>
  ) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...base,
      ...extra,
    }
    if (level === 'error') {
      console.error(JSON.stringify(entry))
    } else {
      console.log(JSON.stringify(entry))
    }
  }

  return {
    info: (msg, extra) => emit('info', msg, extra),
    warn: (msg, extra) => emit('warn', msg, extra),
    error: (msg, extra) => emit('error', msg, extra),
  }
}
