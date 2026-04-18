'use client'

import Button from '@/components/Button'
import Card from '@/components/Card'
import { usePasscodeSubmit } from './usePasscodeSubmit'

interface PasscodeGateProps {
  albumId: string
  onUnlock: (code: string) => void
}

/**
 * Gate UI — prompts for a passcode, validates via /api/access,
 * and calls `onUnlock` with the valid code.
 *
 * All submission logic (Turnstile, API call, auto-submit, dev bypass)
 * lives in the `usePasscodeSubmit` hook.
 */
export default function PasscodeGate({ albumId, onUnlock }: PasscodeGateProps) {
  const { code, setCode, error, loading, ready, turnstileRef, handleSubmit } =
    usePasscodeSubmit(albumId, onUnlock)

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
          <div ref={turnstileRef} className="flex justify-center" />

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
            disabled={loading || !ready}
          >
            {loading ? '検証中…' : 'アクセス'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
