'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

// ─── Context ──────────────────────────────────────────────────────────────────

interface ImageViewerContextValue {
  openImage: (src: string, alt: string) => void
}

const ImageViewerContext = createContext<ImageViewerContextValue>({
  openImage: () => {},
})

export const useImageViewer = () => useContext(ImageViewerContext)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ZOOM_SCALE = 2.5
const MAX_SCALE = 5

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}
function ptDist(a: PointerEvent, b: PointerEvent) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}
function ptMid(a: PointerEvent, b: PointerEvent) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  src: string
  alt: string
  onClose: () => void
}

export function ImageViewerModal({ src, alt, onClose }: ModalProps) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  // Lazily capture document.body so createPortal only runs client-side
  const [portalTarget] = useState<Element | null>(() =>
    typeof document !== 'undefined' ? document.body : null
  )

  const wrapRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef<Map<number, PointerEvent>>(new Map())
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<number>(0)
  // true if the pointer has moved enough to be a drag rather than a click/tap
  const didMoveRef = useRef(false)

  // Fade in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Use a ref so the Escape handler always sees the latest triggerClose
  const triggerCloseRef = useRef<() => void>(() => {})

  const triggerClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    triggerCloseRef.current = triggerClose
  }, [triggerClose])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerCloseRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const resetZoom = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  // Zoom towards a viewport point — used for touch gestures and desktop clicks
  const zoomAt = useCallback((nextScale: number, cx: number, cy: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = cx - rect.left - rect.width / 2
    const py = cy - rect.top - rect.height / 2
    setScale((prev) => {
      const clamped = clamp(nextScale, 1, MAX_SCALE)
      const ratio = clamped / prev
      setTranslate((t) => ({
        x: px - (px - t.x) * ratio,
        y: py - (py - t.y) * ratio,
      }))
      return clamped
    })
  }, [])

  // ─── Pointer handlers ─────────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      pointersRef.current.set(e.pointerId, e.nativeEvent)
      didMoveRef.current = false
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }

      // Touch double-tap
      if (e.pointerType === 'touch' && pointersRef.current.size === 1) {
        lastPinchDistRef.current = null
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
          if (scale > 1) {
            resetZoom()
          } else {
            zoomAt(ZOOM_SCALE, e.clientX, e.clientY)
          }
          lastTapRef.current = 0
        } else {
          lastTapRef.current = now
        }
      }
    },
    [scale, resetZoom, zoomAt]
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, e.nativeEvent)

      if (lastPanPosRef.current) {
        const dx = e.clientX - lastPanPosRef.current.x
        const dy = e.clientY - lastPanPosRef.current.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMoveRef.current = true
      }

      const ptrs = Array.from(pointersRef.current.values())

      if (ptrs.length === 2 && e.pointerType === 'touch') {
        // ── Pinch ──
        const [a, b] = ptrs
        const d = ptDist(a, b)
        const m = ptMid(a, b)
        if (lastPinchDistRef.current !== null) {
          const ratio = d / lastPinchDistRef.current
          setScale((prev) => {
            const next = clamp(prev * ratio, 1, MAX_SCALE)
            const el = wrapRef.current
            if (el) {
              const rect = el.getBoundingClientRect()
              const px = m.x - rect.left - rect.width / 2
              const py = m.y - rect.top - rect.height / 2
              const r = next / prev
              setTranslate((t) => ({
                x: px - (px - t.x) * r,
                y: py - (py - t.y) * r,
              }))
            }
            return next
          })
        }
        lastPinchDistRef.current = d
        lastPanPosRef.current = m
      } else if (ptrs.length === 1 && scale > 1) {
        // ── Pan ──
        const panStart = lastPanPosRef.current
        if (panStart) {
          const dx = e.clientX - panStart.x
          const dy = e.clientY - panStart.y
          setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }))
        }
        lastPanPosRef.current = { x: e.clientX, y: e.clientY }
      }
    },
    [scale]
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const wasClick = !didMoveRef.current && pointersRef.current.size === 1

      // Desktop click → toggle zoom, always anchored at image center
      if (wasClick && e.pointerType !== 'touch') {
        if (scale > 1) {
          resetZoom()
        } else {
          setScale(ZOOM_SCALE)
          setTranslate({ x: 0, y: 0 })
        }
      }

      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) lastPinchDistRef.current = null
      if (pointersRef.current.size === 0) {
        lastPanPosRef.current = null
      }
    },
    [scale, resetZoom]
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  const transform =
    scale === 1 && translate.x === 0 && translate.y === 0
      ? undefined
      : `translate(${translate.x}px, ${translate.y}px) scale(${scale})`

  if (!portalTarget) return null

  const modal = (
    <>
      {/* Backdrop — clicking outside the image closes the viewer (only when not zoomed in) */}
      <div
        aria-hidden
        onClick={scale === 1 ? triggerClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.18s ease',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Image wrapper — stops clicks from bubbling to the close overlay */}
        <div
          ref={wrapRef}
          role="dialog"
          aria-modal
          aria-label={alt || 'Image viewer'}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'relative',
            display: 'inline-flex',
            touchAction: 'none',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            style={{
              display: 'block',
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              transformOrigin: '50% 50%',
              transform,
              transition: 'none',
              pointerEvents: 'none',
              willChange: 'transform',
            }}
          />
        </div>
      </div>

      {/* Close button — fixed at bottom center */}
      <button
        aria-label="Close image viewer"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          triggerClose()
        }}
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border:
            '1.5px solid color-mix(in srgb, var(--foreground) 20%, transparent)',
          background: 'var(--background)',
          color: 'var(--foreground)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          lineHeight: 1,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
      >
        ✕
      </button>
    </>
  )

  return createPortal(modal, portalTarget)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ src: string; alt: string } | null>(
    null
  )

  const openImage = useCallback((src: string, alt: string) => {
    setCurrent({ src, alt })
  }, [])

  const closeImage = useCallback(() => {
    setCurrent(null)
  }, [])

  return (
    <ImageViewerContext.Provider value={{ openImage }}>
      {children}
      {current && (
        <ImageViewerModal
          key={current.src}
          src={current.src}
          alt={current.alt}
          onClose={closeImage}
        />
      )}
    </ImageViewerContext.Provider>
  )
}
