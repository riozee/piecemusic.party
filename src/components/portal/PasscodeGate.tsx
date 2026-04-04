'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'

const TURNSTILE_SITE_KEY = '0x4AAAAAAC0hXP71wg9xv4ji'

interface PasscodeGateProps {
  albumId: string
  onUnlock: (code: string) => void
}

/**
 * Gate UI — prompts for a passcode, validates via /api/access (verify mode),
 * and calls `onUnlock` with the valid code.
 */
export default function PasscodeGate({ albumId, onUnlock }: PasscodeGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [widgetLoaded, setWidgetLoaded] = useState(false)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  // tokenRef holds the fresh token delivered by the callback after execute()
  const tokenRef = useRef<string | null>(null)

  // ---- Load Turnstile script once ------------------------------------------
  useEffect(() => {
    const SCRIPT_ID = 'cf-turnstile-script'
    if (document.getElementById(SCRIPT_ID)) {
      // Script already loaded — render widget directly
      renderWidget()
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'
    script.async = true

    // Global callback invoked by Turnstile SDK once loaded
    ;(window as unknown as Record<string, unknown>).onTurnstileLoad = () => {
      renderWidget()
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup widget on unmount
      if (
        widgetIdRef.current !== null &&
        (window as unknown as Record<string, { remove: (id: string) => void }>)
          .turnstile
      ) {
        ;(
          window as unknown as Record<string, { remove: (id: string) => void }>
        ).turnstile.remove(widgetIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderWidget() {
    const ts = (
      window as unknown as Record<
        string,
        {
          render: (el: HTMLElement, opts: Record<string, unknown>) => string
        }
      >
    ).turnstile

    if (!ts || !turnstileRef.current) return

    widgetIdRef.current = ts.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      // execution:'execute' keeps widget dormant — token is only generated
      // when ts.execute() is called explicitly (i.e. at submit time).
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
      theme: 'dark',
    })
    setWidgetLoaded(true)
  }

  // ---- Get a fresh token on-demand ----------------------------------------
  const getFreshToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const ts = (
        window as unknown as Record<string, { execute: (id: string) => void }>
      ).turnstile

      if (!ts || widgetIdRef.current === null) {
        reject(new Error('Turnstile widget not ready'))
        return
      }

      // Always discard any stale token before requesting a new one
      tokenRef.current = null
      ts.execute(widgetIdRef.current)

      // Poll for the fresh token (max ~5 s)
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (tokenRef.current) {
          clearInterval(interval)
          resolve(tokenRef.current)
        } else if (attempts > 25) {
          clearInterval(interval)
          reject(new Error('Turnstile token timeout'))
        }
      }, 200)
    })
  }, [])

  // ---- Submit handler ------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!code.trim()) {
        setError('パスコードを入力してください。')
        return
      }

      setLoading(true)
      try {
        const token = await getFreshToken()

        const res = await fetch('/api/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.trim(),
            album_id: albumId,
            token,
          }),
        })

        if (res.ok) {
          onUnlock(code.trim())
          return
        }

        const data = (await res.json()) as { error?: string }
        setError(data.error ?? `エラーが発生しました (${res.status})`)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'ネットワークエラーが発生しました。'
        )
      } finally {
        setLoading(false)
      }
    },
    [code, albumId, onUnlock, getFreshToken]
  )

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <h2 className="text-xl font-bold font-mono mb-1 text-primary-blue tracking-wide">
          ACCESS CODE
        </h2>
        <p className="text-xs opacity-60 mb-6 font-mono">
          アクセスカードに記載されたパスコードを入力してください。
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="passcode"
              className="block text-xs font-mono uppercase tracking-widest opacity-50 mb-1"
            >
              Passcode
            </label>
            <input
              id="passcode"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full bg-transparent border border-foreground/40 px-4 py-3 font-mono text-sm tracking-widest focus:outline-none focus:border-primary-blue transition-colors"
            />
          </div>

          {/* Turnstile widget container */}
          <div ref={turnstileRef} className="flex justify-center" />

          {error && (
            <div className="text-sm text-primary-pink border border-primary-pink/30 bg-primary-pink/5 px-4 py-2 font-mono">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || !widgetLoaded}
          >
            {loading ? '検証中…' : 'アクセス'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
