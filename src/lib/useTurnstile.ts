'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

/* ------------------------------------------------------------------ */
/* Turnstile site key — single source of truth                        */
/* ------------------------------------------------------------------ */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAC0hXP71wg9xv4ji'

/* ------------------------------------------------------------------ */
/* Internal types for the Turnstile browser SDK                       */
/* ------------------------------------------------------------------ */
interface TurnstileAPI {
  render(el: HTMLElement, opts: Record<string, unknown>): string
  remove(id: string): void
  execute(id: string): void
  reset(id: string): void
}

function getTurnstile(): TurnstileAPI | null {
  return (
    ((window as unknown as { turnstile?: TurnstileAPI }).turnstile as
      | TurnstileAPI
      | undefined) ?? null
  )
}

/* ------------------------------------------------------------------ */
/* Shared <script> loader — deduplicates across multiple hook calls   */
/* ------------------------------------------------------------------ */
const SCRIPT_ID = 'cf-turnstile-script'
let sdkReady: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (sdkReady) return sdkReady

  sdkReady = new Promise<void>((resolve) => {
    // SDK already initialised
    if (getTurnstile()) {
      resolve()
      return
    }

    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      // Script tag present but SDK not yet initialised — poll
      const iv = setInterval(() => {
        if (getTurnstile()) {
          clearInterval(iv)
          resolve()
        }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      // SDK may need a tick to initialise after script load
      const iv = setInterval(() => {
        if (getTurnstile()) {
          clearInterval(iv)
          resolve()
        }
      }, 50)
    }
    document.head.appendChild(script)
  })

  return sdkReady
}

/* ------------------------------------------------------------------ */
/* Hook API                                                           */
/* ------------------------------------------------------------------ */
export interface UseTurnstileOptions {
  /** Widget size — `'normal'` shows the branded checkbox, `'invisible'` hides it. */
  size?: 'normal' | 'invisible'
}

export interface UseTurnstileReturn {
  /** Attach this ref to a container `<div>` where the Turnstile widget renders. */
  containerRef: React.RefObject<HTMLDivElement | null>

  /** `true` once the widget is mounted and ready for `execute()` calls. */
  widgetReady: boolean

  /**
   * Request a fresh single-use token on demand.
   * Internally resets the widget, calls `execute()`, and polls for the callback.
   */
  getToken: () => Promise<string>

  /**
   * Reset the widget after a request finishes (success **or** failure).
   *
   * Turnstile tokens are single-use — always call this when the server has
   * consumed (or rejected) a token so the widget is ready for the next
   * `getToken()` call.
   */
  reset: () => void
}

/**
 * Shared React hook that manages a Cloudflare Turnstile widget.
 *
 * - Loads the Turnstile SDK script once (deduped across instances).
 * - Renders the widget in `execution: 'execute'` mode (dormant until
 *   `getToken()` is called).
 * - Exposes `reset()` to invalidate the consumed token after every request.
 */
export function useTurnstile(
  options?: UseTurnstileOptions
): UseTurnstileReturn {
  const size = options?.size ?? 'normal'
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const [widgetReady, setWidgetReady] = useState(false)

  /* ---- Mount: load SDK → render widget ---------------------------------- */
  useEffect(() => {
    let disposed = false

    loadSdk().then(() => {
      if (disposed) return
      const ts = getTurnstile()
      if (!ts || !containerRef.current) return

      widgetIdRef.current = ts.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        execution: 'execute',
        callback: (token: string) => {
          tokenRef.current = token
        },
        'expired-callback': () => {
          tokenRef.current = null
        },
        'error-callback': () => {
          tokenRef.current = null
        },
        size,
        theme: 'dark',
      })
      setWidgetReady(true)
    })

    return () => {
      disposed = true
      const ts = getTurnstile()
      if (ts && widgetIdRef.current !== null) {
        ts.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [size])

  /* ---- getToken: reset → execute → poll --------------------------------- */
  const getToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const ts = getTurnstile()
      if (!ts || widgetIdRef.current === null) {
        reject(new Error('Turnstile widget not ready'))
        return
      }

      // Reset any previous state and discard stale token before fresh challenge
      ts.reset(widgetIdRef.current)
      tokenRef.current = null
      ts.execute(widgetIdRef.current)

      // Poll for the callback-delivered token (max ~5 s)
      let attempts = 0
      const iv = setInterval(() => {
        attempts++
        if (tokenRef.current) {
          clearInterval(iv)
          resolve(tokenRef.current)
        } else if (attempts > 25) {
          clearInterval(iv)
          reject(new Error('Turnstile token timeout'))
        }
      }, 200)
    })
  }, [])

  /* ---- reset: prepare widget for next getToken() call ------------------- */
  const reset = useCallback(() => {
    const ts = getTurnstile()
    if (ts && widgetIdRef.current !== null) {
      ts.reset(widgetIdRef.current)
    }
    tokenRef.current = null
  }, [])

  return { containerRef, widgetReady, getToken, reset }
}
