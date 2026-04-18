'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTurnstile } from '@/lib/useTurnstile'
import { PORTAL_LS_KEY } from './types'
import { useToast } from './ToastProvider'
import { CLIENT_MSG } from './messages'

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UsePasscodeSubmitReturn {
  /** Current passcode value (controlled input). */
  code: string
  /** Set the passcode value. */
  setCode: (v: string) => void
  /** Inline validation / server error message, or null. */
  error: string | null
  /** Whether a submit is in flight. */
  loading: boolean
  /** Whether the Turnstile widget is ready (always true in dev). */
  ready: boolean
  /** Ref to attach to the Turnstile container div. */
  turnstileRef: React.RefObject<HTMLDivElement | null>
  /** Submit handler for `<form onSubmit>`. */
  handleSubmit: (e: React.FormEvent) => void
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * Encapsulates all passcode submission logic:
 * - Pre-fill from `?code=` or localStorage
 * - Auto-submit when `?code=` is present
 * - Turnstile challenge management
 * - API call + error mapping
 * - Dev bypass (skips Turnstile + API)
 */
export function usePasscodeSubmit(
  albumId: string,
  onUnlock: (code: string) => void
): UsePasscodeSubmitReturn {
  const searchParams = useSearchParams()
  const autoCode = searchParams.get('code')
  const toast = useToast()

  const [code, setCode] = useState(() => {
    if (autoCode) return autoCode
    return readCodeFromStorage(albumId)
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const autoSubmittedRef = useRef(false)

  const { containerRef, widgetReady, widgetError, getToken, reset } =
    useTurnstile()

  const isDev = process.env.NODE_ENV === 'development'

  // ---- Core submit ---------------------------------------------------------
  const doSubmit = useCallback(
    async (codeValue: string) => {
      setError(null)

      if (!codeValue) {
        setError(CLIENT_MSG.PASSCODE_EMPTY)
        return
      }

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
          body: JSON.stringify({ code: codeValue, album_id: albumId, token }),
        })

        if (res.ok) {
          onUnlock(codeValue)
          return
        }

        const data = (await res.json()) as { error?: string }
        setError(data.error ?? CLIENT_MSG.SERVER_ERROR)
      } catch (err) {
        if (err instanceof Error && err.message === 'Turnstile token timeout') {
          setError(CLIENT_MSG.TURNSTILE_TIMEOUT)
        } else {
          setError(CLIENT_MSG.NETWORK_ERROR)
        }
      } finally {
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
  useEffect(() => {
    if (!autoCode || autoSubmittedRef.current) return
    if (!isDev && !widgetReady) return
    autoSubmittedRef.current = true
    doSubmit(autoCode.trim())
  }, [autoCode, isDev, widgetReady, doSubmit])

  // ---- Surface Turnstile widget failure as a toast -------------------------
  const turnstileToastShown = useRef(false)
  useEffect(() => {
    if (widgetError && !turnstileToastShown.current) {
      turnstileToastShown.current = true
      toast.show(CLIENT_MSG.TURNSTILE_LOAD_FAIL, 'warning', {
        persistent: true,
      })
    }
  }, [widgetError, toast])

  return {
    code,
    setCode,
    error,
    loading,
    ready: isDev || widgetReady,
    turnstileRef: containerRef,
    handleSubmit,
  }
}
