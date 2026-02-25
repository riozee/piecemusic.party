'use client'

import { useState, type ReactNode } from 'react'
import { ImageViewerModal } from './ImageViewer'

// ─── ClickableImage ───────────────────────────────────────────────────────────
// Drop-in <img> replacement that opens the fullscreen image viewer on click.

interface ClickableImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

export function ClickableImage({
  src,
  alt,
  className,
  style,
}: ClickableImageProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={['cursor-zoom-in', className].filter(Boolean).join(' ')}
        style={style}
        onClick={() => setOpen(true)}
      />
      {open && (
        <ImageViewerModal src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

// ─── ClickableImageTrigger ────────────────────────────────────────────────────
// Wraps arbitrary children (e.g. a Next.js <Image fill>) and opens the viewer
// when clicked. Renders as a div that takes on the provided className so it can
// replace the original container element without changing layout.

interface ClickableImageTriggerProps {
  /** Image src to display in the viewer. If falsy, children are rendered as-is. */
  src: string | undefined
  alt: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function ClickableImageTrigger({
  src,
  alt,
  children,
  className,
  style,
}: ClickableImageTriggerProps) {
  const [open, setOpen] = useState(false)

  if (!src) {
    // No image to show — render children without wrapping in a clickable element
    return <>{children}</>
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={['cursor-zoom-in', className].filter(Boolean).join(' ')}
        style={style}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(true)
        }}
      >
        {children}
      </div>
      {open && (
        <ImageViewerModal src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
