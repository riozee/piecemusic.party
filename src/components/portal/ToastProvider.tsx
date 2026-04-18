'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type ToastLevel = 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  level: ToastLevel
  message: string
  /** If true the toast never auto-dismisses (user must tap X). */
  persistent: boolean
  /** Timestamp (ms) when the toast was created. */
  createdAt: number
}

export interface ToastAPI {
  /** Show a toast notification. Returns the toast ID for programmatic dismissal. */
  show: (
    message: string,
    level?: ToastLevel,
    options?: { persistent?: boolean }
  ) => number
  /** Dismiss a specific toast by ID. */
  dismiss: (id: number) => void
  /** Dismiss all toasts. */
  clear: () => void
}

/* ------------------------------------------------------------------ */
/* Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastAPI | null>(null)

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>')
  }
  return ctx
}

/* ------------------------------------------------------------------ */
/* Visual config per level                                            */
/* ------------------------------------------------------------------ */

const LEVEL_STYLES: Record<
  ToastLevel,
  { border: string; accent: string; icon: string }
> = {
  error: {
    border: 'border-primary-pink/60',
    accent: 'bg-primary-pink',
    icon: '✕',
  },
  warning: {
    border: 'border-primary-orange/60',
    accent: 'bg-primary-orange',
    icon: '!',
  },
  info: {
    border: 'border-primary-blue/60',
    accent: 'bg-primary-blue',
    icon: 'i',
  },
}

/** Auto-dismiss delay in ms. */
const AUTO_DISMISS_MS = 6000

/* ------------------------------------------------------------------ */
/* Single Toast Chip                                                  */
/* ------------------------------------------------------------------ */

function ToastChip({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: number) => void
}) {
  const style = LEVEL_STYLES[item.level]
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss
  useEffect(() => {
    if (item.persistent) return
    timerRef.current = setTimeout(() => {
      setExiting(true)
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [item.persistent])

  // Remove from DOM after exit animation
  useEffect(() => {
    if (!exiting) return
    const t = setTimeout(() => onDismiss(item.id), 300)
    return () => clearTimeout(t)
  }, [exiting, item.id, onDismiss])

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setExiting(true)
  }

  return (
    <div
      role="alert"
      aria-live={item.level === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`
        pointer-events-auto flex items-start gap-3
        border ${style.border} bg-background/95 backdrop-blur-sm
        px-4 py-3 shadow-lg font-mono text-sm
        transition-all duration-300 ease-out
        ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      style={{ maxWidth: 'min(420px, 90vw)' }}
    >
      {/* Accent dot */}
      <span
        className={`shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-background ${style.accent}`}
      >
        {style.icon}
      </span>

      {/* Message */}
      <span className="flex-1 leading-relaxed text-foreground/90 wrap-break-word">
        {item.message}
      </span>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="通知を閉じる"
        className="shrink-0 opacity-40 hover:opacity-100 transition-opacity text-foreground text-xs cursor-pointer mt-0.5"
      >
        ✕
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */

const MAX_VISIBLE = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idCounter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clear = useCallback(() => {
    setToasts([])
  }, [])

  const show = useCallback(
    (
      message: string,
      level: ToastLevel = 'error',
      options?: { persistent?: boolean }
    ): number => {
      const id = ++idCounter.current
      const item: ToastItem = {
        id,
        level,
        message,
        persistent: options?.persistent ?? false,
        createdAt: Date.now(),
      }
      setToasts((prev) => {
        // Cap visible toasts — evict oldest non-persistent ones
        const next = [...prev, item]
        if (next.length > MAX_VISIBLE) {
          const evictable = next.findIndex((t) => !t.persistent)
          if (evictable >= 0) next.splice(evictable, 1)
        }
        return next
      })
      return id
    },
    []
  )

  const api: ToastAPI = { show, dismiss, clear }

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container — fixed bottom-right, above the audio player */}
      {toasts.length > 0 && (
        <div
          aria-label="通知"
          className="fixed bottom-20 right-4 z-60 flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map((item) => (
            <ToastChip key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
