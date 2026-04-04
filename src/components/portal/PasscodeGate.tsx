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
  const [turnstileReady, setTurnstileReady] = useState(false)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
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
      callback: (token: string) => {
        tokenRef.current = token
        setTurnstileReady(true)
      },
      'expired-callback': () => {
        tokenRef.current = null
        setTurnstileReady(false)
      },
      theme: 'dark',
    })
  }

  // ---- Submit handler ------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!code.trim()) {
        setError('パスコードを入力してください。')
        return
      }
      if (!tokenRef.current) {
        setError('Turnstile を完了してください。')
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.trim(),
            album_id: albumId,
            token: tokenRef.current,
          }),
        })

        if (res.ok) {
          onUnlock(code.trim())
          return
        }

        const data = (await res.json()) as { error?: string }
        setError(data.error ?? `エラーが発生しました (${res.status})`)
      } catch {
        setError('ネットワークエラーが発生しました。')
      } finally {
        setLoading(false)
      }
    },
    [code, albumId, onUnlock]
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
            disabled={loading || !turnstileReady}
          >
            {loading ? '検証中…' : 'アクセス'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
