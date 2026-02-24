'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'

type AutoFitTextProps = {
  children: React.ReactNode
  className?: string
  minFontSize?: number
  maxFontSize?: number
  onHeightChange?: (height: number) => void
}

export default function AutoFitText({
  children,
  className = '',
  minFontSize = 12,
  maxFontSize = 96,
  onHeightChange,
}: AutoFitTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const [fontSize, setFontSize] = useState<number>(maxFontSize)

  useLayoutEffect(() => {
    const container = containerRef.current
    const measureText = measureRef.current
    if (!container || !measureText) return

    const resize = () => {
      // Get the current width available for the text
      const available = container.getBoundingClientRect().width
      if (available <= 0) return

      // Measure text at maxFontSize
      const measured = measureText.getBoundingClientRect().width
      if (measured <= 0) return

      // Calculate how much we need to scale to fit
      let newSize = (maxFontSize * available) / measured

      // Clamp
      if (newSize < minFontSize) newSize = minFontSize
      if (newSize > maxFontSize) newSize = maxFontSize

      setFontSize(newSize)

      // Report the actual height of the container back to parent
      if (onHeightChange) {
        onHeightChange(container.getBoundingClientRect().height)
      }
    }

    // Run once on mount/layout
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // Also trigger on window resize for safety
    window.addEventListener('resize', resize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [children, minFontSize, maxFontSize, onHeightChange])

  return (
    <div ref={containerRef} className={className}>
      {/* Hidden measure span at maxFontSize to provide a constant scale reference */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          fontSize: `${maxFontSize}px`,
          pointerEvents: 'none',
          display: 'inline-block', // Crucial for measuring actual text width
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          letterSpacing: 'inherit',
          lineHeight: 1,
        }}
      >
        {children}
      </span>

      <span
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: 'nowrap',
          display: 'block',
          lineHeight: 1.1,
          width: '100%',
          textAlign: 'inherit', // Respect text-right/text-center from className
        }}
      >
        {children}
      </span>
    </div>
  )
}
