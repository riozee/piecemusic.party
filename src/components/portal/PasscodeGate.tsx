'use client'

import { useState, useCallback } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { useTurnstile } from '@/lib/useTurnstile'

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

  const { containerRef, widgetReady, getToken, reset } = useTurnstile()

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
        const token = await getToken()

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
        // Turnstile tokens are single-use — always reset after request
        reset()
        setLoading(false)
      }
    },
    [code, albumId, onUnlock, getToken, reset]
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
          <div ref={containerRef} className="flex justify-center" />

          {error && (
            <div className="text-sm text-primary-pink border border-primary-pink/30 bg-primary-pink/5 px-4 py-2 font-mono">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || !widgetReady}
          >
            {loading ? '検証中…' : 'アクセス'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
