'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { useTurnstile } from '@/lib/useTurnstile'
import { PORTAL_LS_KEY } from './types'
import { useToast } from './ToastProvider'

interface PasscodeGateProps {
  albumId: string
  onUnlock: (code: string) => void
}

/**
 * Gate UI — prompts for a passcode, validates via /api/access (verify mode),
 * and calls `onUnlock` with the valid code.
 *
 * Supports ?code=XXXX — pre-fills and auto-submits the passcode.
 */

function readCodeFromStorage(albumId: string): string {
  try {
    const stored: Record<string, string> = JSON.parse(
      localStorage.getItem(PORTAL_LS_KEY) ?? '{}'
    )
    return stored[albumId] ?? ''
  } catch {
    return ''
  }
}

export default function PasscodeGate({ albumId, onUnlock }: PasscodeGateProps) {
  const searchParams = useSearchParams()
  const autoCode = searchParams.get('code')
  const toast = useToast()

  const [code, setCode] = useState(() => {
    // ?code= takes priority (and will auto-submit)
    if (autoCode) return autoCode
    // Otherwise pre-fill from localStorage — no auto-submit
    return readCodeFromStorage(albumId)
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const autoSubmittedRef = useRef(false)

  const { containerRef, widgetReady, widgetError, getToken, reset } =
    useTurnstile()

  // Next.js inlines process.env.NODE_ENV as a string literal at build time —
  // this branch is completely dead-code-eliminated in production builds.
  const isDev = process.env.NODE_ENV === 'development'

  // ---- Core submit logic (accepts explicit code value) ---------------------
  const doSubmit = useCallback(
    async (codeValue: string) => {
      setError(null)

      if (!codeValue) {
        setError('パスコードを入力してください。')
        return
      }

      // Dev bypass — skip Turnstile and API entirely
      if (isDev) {
        onUnlock(codeValue)
        return
      }

      setLoading(true)
      try {
        const token = await getToken()

        const res = await fetch('/api/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: codeValue,
            album_id: albumId,
            token,
          }),
        })

        if (res.ok) {
          onUnlock(codeValue)
          return
        }

        // Server returned an error — show the server's message inline
        const data = (await res.json()) as { error?: string }
        setError(
          data.error ??
            'サーバーとの通信中にエラーが発生しました。しばらく経ってからもう一度お試しください。'
        )
      } catch (err) {
        // Network-level failures — the server was never reached
        if (err instanceof Error && err.message === 'Turnstile token timeout') {
          setError(
            'セキュリティ確認がタイムアウトしました。広告ブロッカーを無効にするか、ページを再読み込みしてお試しください。'
          )
        } else {
          setError(
            'サーバーとの通信が切断されました。通信環境をご確認の上、数分後にもう一度お試しください。'
          )
        }
      } finally {
        // Turnstile tokens are single-use — always reset after request
        reset()
        setLoading(false)
      }
    },
    [albumId, isDev, onUnlock, getToken, reset]
  )

  // ---- Form submit handler -------------------------------------------------
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      doSubmit(code.trim())
    },
    [code, doSubmit]
  )

  // ---- Auto-submit when ?code= is present ----------------------------------
  // In dev: fire on mount.
  // In prod: wait until Turnstile widget is ready before submitting.
  useEffect(() => {
    if (!autoCode || autoSubmittedRef.current) return
    if (!isDev && !widgetReady) return
    autoSubmittedRef.current = true
    doSubmit(autoCode.trim())
  }, [autoCode, isDev, widgetReady, doSubmit])

  // ---- Surface Turnstile widget failure as a toast (not inline) ------------
  // This fires when ad-blockers prevent the SDK from loading, or when the
  // challenge expires / errors after the widget was already mounted.
  const turnstileToastShown = useRef(false)
  useEffect(() => {
    if (widgetError && !turnstileToastShown.current) {
      turnstileToastShown.current = true
      toast.show(
        'セキュリティ確認の読み込みに失敗しました。広告ブロッカーを無効にするか、ページを再読み込みしてください。',
        'warning',
        { persistent: true }
      )
    }
  }, [widgetError, toast])

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
              placeholder="XXXXXXXX"
              aria-invalid={!!error}
              aria-describedby={error ? 'passcode-error' : undefined}
              className="cursor-target w-full bg-transparent border border-foreground/40 px-4 py-3 font-mono text-sm tracking-widest focus:outline-none focus:border-primary-blue transition-colors"
            />
          </div>

          {/* Turnstile widget container */}
          <div ref={containerRef} className="flex justify-center" />

          {error && (
            <div
              id="passcode-error"
              role="alert"
              className="text-sm text-primary-pink border border-primary-pink/30 bg-primary-pink/5 px-4 py-2 font-mono"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || (!isDev && !widgetReady)}
          >
            {loading ? '検証中…' : 'アクセス'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
