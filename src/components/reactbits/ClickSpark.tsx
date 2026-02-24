'use client'

import React, { useRef, useEffect, useCallback } from 'react'

interface ClickSparkProps {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  extraScale?: number
  children?: React.ReactNode
}

interface Spark {
  x: number
  y: number
  angle: number
  startTime: number
  color: string
}

const PRIMARY_COLOR_VARS = [
  '--primary-blue',
  '--primary-orange',
  '--primary-green',
  '--primary-pink',
] as const

const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor,
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.0,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sparksRef = useRef<Spark[]>([])
  const startTimeRef = useRef<number | null>(null)
  const paletteRef = useRef<string[]>([])
  const animationIdRef = useRef<number | null>(null)
  const drawRef = useRef<((timestamp: number) => void) | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    let resizeTimeout: NodeJS.Timeout

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect()
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(resizeCanvas, 100)
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(parent)

    resizeCanvas()

    return () => {
      ro.disconnect()
      clearTimeout(resizeTimeout)
    }
  }, [])

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear':
          return t
        case 'ease-in':
          return t * t
        case 'ease-in-out':
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        default:
          return t * (2 - t)
      }
    },
    [easing]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.documentElement

    const updatePalette = () => {
      const styles = getComputedStyle(root)
      paletteRef.current = PRIMARY_COLOR_VARS.map((name) =>
        styles.getPropertyValue(name).trim()
      ).filter(Boolean)
    }

    updatePalette()

    const observer = new MutationObserver(updatePalette)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (sparksRef.current.length > 0) {
        sparksRef.current = sparksRef.current.filter((spark: Spark) => {
          const elapsed = timestamp - spark.startTime
          if (elapsed >= duration) {
            return false
          }

          const progress = elapsed / duration
          const eased = easeFunc(progress)

          const distance = eased * sparkRadius * extraScale
          const lineLength = sparkSize * (1 - eased)

          const x1 = spark.x + distance * Math.cos(spark.angle)
          const y1 = spark.y + distance * Math.sin(spark.angle)

          ctx.fillStyle = spark.color
          ctx.beginPath()
          // Draw a tiny puzzle piece / notched square
          const size = lineLength * 0.8
          if (size > 0) {
            ctx.rect(x1 - size / 2, y1 - size / 2, size, size)
            // Add a small notch
            ctx.arc(x1 + size / 2, y1, size / 3, 0, Math.PI * 2)
            ctx.fill()
          }

          return true
        })
        animationIdRef.current = requestAnimationFrame(draw)
      } else {
        animationIdRef.current = null
      }
    }

    // Expose draw function to be called from handleClick
    // We can attach it to a ref
    drawRef.current = draw

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [
    sparkColor,
    sparkSize,
    sparkRadius,
    sparkCount,
    duration,
    easeFunc,
    extraScale,
  ])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const fallbackColor = '#ffffff'
    const palette = paletteRef.current.length
      ? paletteRef.current
      : [sparkColor ?? fallbackColor]

    const resolvedColor =
      sparkColor ??
      palette[Math.floor(Math.random() * palette.length)] ??
      fallbackColor

    const now = performance.now()
    const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
      x,
      y,
      angle: (2 * Math.PI * i) / sparkCount,
      startTime: now,
      color: resolvedColor,
    }))

    const wasEmpty = sparksRef.current.length === 0
    sparksRef.current.push(...newSparks)

    if (wasEmpty && drawRef.current) {
      animationIdRef.current = requestAnimationFrame(drawRef.current)
    }
  }

  return (
    <div className="relative w-full h-full" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {children}
    </div>
  )
}

export default ClickSpark
