'use client'

import React, { useRef, useEffect, useCallback, CSSProperties } from 'react'
import { gsap } from 'gsap'

interface PixelTransitionProps {
  children: React.ReactNode
  gridSize?: number
  pixelColor?: string
  pixelOpacity?: number
  animationDuration?: number
  className?: string
  style?: CSSProperties
}

const PixelTransition: React.FC<PixelTransitionProps> = ({
  children,
  gridSize = 7,
  pixelColor = 'currentColor',
  pixelOpacity = 1,
  animationDuration = 0.6,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pixelGridRef = useRef<HTMLDivElement | null>(null)
  const imageReadyRef = useRef(false)
  const inViewRef = useRef(false)

  const pixels = React.useMemo(() => {
    const arr = []
    const size = 100 / gridSize
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        arr.push({
          id: `${row}-${col}`,
          width: `${size}%`,
          height: `${size}%`,
          left: `${col * size}%`,
          top: `${row * size}%`,
        })
      }
    }
    return arr
  }, [gridSize])

  const resetPixels = useCallback(() => {
    const pixelGridEl = pixelGridRef.current
    if (!pixelGridEl) return

    const pixelElements = pixelGridEl.querySelectorAll<HTMLDivElement>(
      '.pixelated-image-card__pixel'
    )
    if (!pixelElements.length) return

    gsap.killTweensOf(pixelElements)
    gsap.set(pixelElements, { opacity: pixelOpacity, display: 'block' })
  }, [pixelOpacity])

  const animatePixels = useCallback((): void => {
    const pixelGridEl = pixelGridRef.current
    if (!pixelGridEl) return

    const pixelElements = pixelGridEl.querySelectorAll<HTMLDivElement>(
      '.pixelated-image-card__pixel'
    )
    if (!pixelElements.length) return

    gsap.killTweensOf(pixelElements)
    gsap.set(pixelElements, { display: 'block', opacity: pixelOpacity })

    const totalPixels = pixelElements.length
    const staggerDuration = totalPixels
      ? animationDuration / totalPixels
      : animationDuration

    gsap.to(pixelElements, {
      opacity: 0,
      duration: animationDuration,
      stagger: {
        each: staggerDuration,
        from: 'random',
      },
      onComplete: () => {
        gsap.set(pixelElements, { display: 'none' })
      },
    })
  }, [animationDuration, pixelOpacity])

  const handleChildReady = useCallback(() => {
    imageReadyRef.current = true
    if (inViewRef.current) {
      animatePixels()
    }
  }, [animatePixels])

  useEffect(() => {
    imageReadyRef.current = false
    resetPixels()
  }, [resetPixels])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let detach: (() => void) | null = null
    let observer: MutationObserver | null = null

    const attachToImage = (img: HTMLImageElement): void => {
      const handleLoad = (): void => {
        handleChildReady()
      }

      if (img.complete) {
        handleLoad()
        return
      }

      img.addEventListener('load', handleLoad, { once: true })
      detach = () => {
        img.removeEventListener('load', handleLoad)
      }
    }

    const tryAttach = (): boolean => {
      const img = container.querySelector('img') as HTMLImageElement | null
      if (!img) return false
      attachToImage(img)
      return true
    }

    if (!tryAttach()) {
      observer = new MutationObserver((mutations) => {
        // Only check if an img was added
        const hasNewImg = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some(
            (node) =>
              node.nodeName === 'IMG' ||
              (node instanceof HTMLElement && node.querySelector('img'))
          )
        )

        if (hasNewImg && tryAttach() && observer) {
          observer.disconnect()
        }
      })
      observer.observe(container, { childList: true, subtree: true })
    }

    return () => {
      if (detach) {
        detach()
      }
      if (observer) {
        observer.disconnect()
      }
    }
  }, [handleChildReady])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target !== container) return
          if (entry.isIntersecting) {
            if (!inViewRef.current) {
              inViewRef.current = true
              if (imageReadyRef.current) {
                animatePixels()
              }
            }
          } else if (inViewRef.current) {
            inViewRef.current = false
            resetPixels()
          }
        })
      },
      { threshold: 0.2 }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      inViewRef.current = false
    }
  }, [animatePixels, resetPixels])

  return (
    <div
      ref={containerRef}
      className={`relative inline-block overflow-hidden ${className}`.trim()}
      style={style}
    >
      {children}
      <div
        ref={pixelGridRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {pixels.map((p) => (
          <div
            key={p.id}
            className="pixelated-image-card__pixel absolute"
            style={{
              backgroundColor: pixelColor,
              opacity: pixelOpacity,
              display: 'block',
              width: p.width,
              height: p.height,
              left: p.left,
              top: p.top,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default PixelTransition
