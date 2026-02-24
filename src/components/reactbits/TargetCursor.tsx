'use client'

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { gsap } from 'gsap'

export interface TargetCursorProps {
  targetSelector?: string
  /** how long one beat cycle lasts (seconds) */
  beatDuration?: number
  hideDefaultCursor?: boolean
  hoverDuration?: number
  parallaxOn?: boolean
  /** maximum tilt angle in degrees when accelerating left/right */
  maxTiltAngle?: number
  /** extra distance added when snapping corners to a target (pixels) */
  snapOffset?: number
}

const TargetCursor: React.FC<TargetCursorProps> = ({
  targetSelector = '.cursor-target',
  beatDuration = 0.8,
  hideDefaultCursor = true,
  hoverDuration = 0.2,
  parallaxOn = true,
  maxTiltAngle = 15,
  snapOffset = 6,
}) => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cornersRef = useRef<NodeListOf<HTMLDivElement> | null>(null)
  const beatTl = useRef<gsap.core.Timeline | null>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  const isActiveRef = useRef(false)
  const targetCornerPositionsRef = useRef<{ x: number; y: number }[] | null>(
    null
  )
  const tickerFnRef = useRef<(() => void) | null>(null)
  const activeStrengthRef = useRef({ current: 0 })

  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const detectMobile = () => {
      const hasTouchScreen =
        'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      const winWithOpera = window as typeof window & { opera?: string }
      const userAgent =
        navigator.userAgent || navigator.vendor || winWithOpera.opera || ''
      const mobileRegex =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
      const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase())

      setIsMobile((hasTouchScreen && isSmallScreen) || isMobileUserAgent)
    }

    const frame = requestAnimationFrame(detectMobile)
    window.addEventListener('resize', detectMobile)
    window.addEventListener('orientationchange', detectMobile)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', detectMobile)
      window.removeEventListener('orientationchange', detectMobile)
    }
  }, [])

  // borderWidth determines the stroke thickness for each of the four corner
  // elements. Lowering it makes the edges visually thinner and also adjusts
  // the hover positioning calculations which use this value.
  const constants = useMemo(() => ({ borderWidth: 1, cornerSize: 12 }), [])

  // for tilt calculation
  const lastMouseXRef = useRef<number | null>(null)
  const lastMouseTimeRef = useRef<number | null>(null)
  const lastVXRef = useRef<number>(0)
  const lastAccelRef = useRef<number>(0)
  const tiltResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // create or recreate the beating animation for the corners
  const createBeatTimeline = useCallback(() => {
    if (!cursorRef.current) return
    if (beatTl.current) {
      beatTl.current.kill()
    }
    const corners = Array.from(
      cursorRef.current.querySelectorAll<HTMLDivElement>(
        '.target-cursor-corner'
      )
    )
    if (corners.length === 0) return
    // ensure corners are at resting positions before starting animation
    const { cornerSize } = constants
    const basePositions = [
      { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: cornerSize * 0.5 },
      { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
    ]
    corners.forEach((corner, i) => {
      gsap.set(corner, { x: basePositions[i].x, y: basePositions[i].y })
    })
    const amp = constants.cornerSize * 0.5
    beatTl.current = gsap.timeline({ repeat: -1, yoyo: true })
    beatTl.current.to(
      corners[0],
      {
        x: `-=${amp}`,
        y: `-=${amp}`,
        duration: beatDuration / 2,
        ease: 'power1.inOut',
      },
      0
    )
    beatTl.current.to(
      corners[1],
      {
        x: `+=${amp}`,
        y: `-=${amp}`,
        duration: beatDuration / 2,
        ease: 'power1.inOut',
      },
      0
    )
    beatTl.current.to(
      corners[2],
      {
        x: `+=${amp}`,
        y: `+=${amp}`,
        duration: beatDuration / 2,
        ease: 'power1.inOut',
      },
      0
    )
    beatTl.current.to(
      corners[3],
      {
        x: `-=${amp}`,
        y: `+=${amp}`,
        duration: beatDuration / 2,
        ease: 'power1.inOut',
      },
      0
    )
  }, [beatDuration, constants])

  const moveCursor = useCallback((x: number, y: number) => {
    if (!cursorRef.current) return
    gsap.to(cursorRef.current, { x, y, duration: 0.1, ease: 'power3.out' })
  }, [])

  useEffect(() => {
    if (isMobile || !cursorRef.current) return

    const originalCursor = document.body.style.cursor
    const activeStrength = activeStrengthRef.current
    if (hideDefaultCursor) {
      document.body.style.cursor = 'none'
    }

    const cursor = cursorRef.current
    cornersRef.current = cursor.querySelectorAll<HTMLDivElement>(
      '.target-cursor-corner'
    )

    let activeTarget: Element | null = null
    let currentLeaveHandler: (() => void) | null = null
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null

    const cleanupTarget = (target: Element) => {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler)
      }
      currentLeaveHandler = null
    }

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })

    const createBeatTimeline = () => {
      if (beatTl.current) {
        beatTl.current.kill()
      }
      const corners = Array.from(
        cursor.querySelectorAll<HTMLDivElement>('.target-cursor-corner')
      )
      if (corners.length === 0) return
      // move corners a little farther/closer from centre to simulate a beat
      const amp = constants.cornerSize * 0.5
      beatTl.current = gsap.timeline({ repeat: -1, yoyo: true })
      // top-left
      beatTl.current.to(
        corners[0],
        {
          x: `-=${amp}`,
          y: `-=${amp}`,
          duration: beatDuration / 2,
          ease: 'power1.inOut',
        },
        0
      )
      // top-right
      beatTl.current.to(
        corners[1],
        {
          x: `+=${amp}`,
          y: `-=${amp}`,
          duration: beatDuration / 2,
          ease: 'power1.inOut',
        },
        0
      )
      // bottom-right
      beatTl.current.to(
        corners[2],
        {
          x: `+=${amp}`,
          y: `+=${amp}`,
          duration: beatDuration / 2,
          ease: 'power1.inOut',
        },
        0
      )
      // bottom-left
      beatTl.current.to(
        corners[3],
        {
          x: `-=${amp}`,
          y: `+=${amp}`,
          duration: beatDuration / 2,
          ease: 'power1.inOut',
        },
        0
      )
    }

    createBeatTimeline()

    const tickerFn = () => {
      if (
        !targetCornerPositionsRef.current ||
        !cursorRef.current ||
        !cornersRef.current
      ) {
        return
      }
      const strength = activeStrength.current
      if (strength === 0) return
      const cursorX = gsap.getProperty(cursorRef.current, 'x') as number
      const cursorY = gsap.getProperty(cursorRef.current, 'y') as number
      const corners = Array.from(cornersRef.current)
      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x') as number
        const currentY = gsap.getProperty(corner, 'y') as number
        const targetX = targetCornerPositionsRef.current![i].x - cursorX
        const targetY = targetCornerPositionsRef.current![i].y - cursorY
        const finalX = currentX + (targetX - currentX) * strength
        const finalY = currentY + (targetY - currentY) * strength
        const duration = strength >= 0.99 ? (parallaxOn ? 0.2 : 0) : 0.05
        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto',
        })
      })
    }

    tickerFnRef.current = tickerFn

    // we will handle movement and tilt together below

    // update tilt based on horizontal acceleration
    const tiltMultiplier = 5000 // tuning constant
    const computeTilt = (currentX: number) => {
      if (isActiveRef.current) {
        // when hovering a target, keep rotation locked to zero
        if (cursorRef.current) {
          gsap.to(cursorRef.current, {
            rotation: 0,
            duration: 0.2,
            ease: 'power3.out',
          })
        }
        return
      }
      const now = performance.now()
      const lastX = lastMouseXRef.current
      const lastT = lastMouseTimeRef.current
      if (lastX !== null && lastT !== null) {
        const dt = now - lastT
        if (dt > 0) {
          const vx = (currentX - lastX) / dt
          const rawAccel = (vx - lastVXRef.current) / dt
          // smooth acceleration to avoid jitter
          const accel = lastAccelRef.current * 0.8 + rawAccel * 0.2
          lastAccelRef.current = accel
          let angle = accel * tiltMultiplier
          angle = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, angle))
          if (cursorRef.current) {
            gsap.to(cursorRef.current, {
              rotation: angle,
              duration: 0.2,
              ease: 'power3.out',
            })
          }
          lastVXRef.current = vx
        }
      }
      lastMouseXRef.current = currentX
      lastMouseTimeRef.current = now

      // schedule a reset to 0 if mouse stops moving
      if (tiltResetTimeoutRef.current) {
        clearTimeout(tiltResetTimeoutRef.current)
      }
      tiltResetTimeoutRef.current = setTimeout(() => {
        if (cursorRef.current && !isActiveRef.current) {
          gsap.to(cursorRef.current, {
            rotation: 0,
            duration: 0.4,
            ease: 'power3.out',
          })
        }
        tiltResetTimeoutRef.current = null
      }, 100)
    }

    const enhancedMoveHandler = (e: MouseEvent) => {
      moveCursor(e.clientX, e.clientY)
      computeTilt(e.clientX)
    }
    window.addEventListener('mousemove', enhancedMoveHandler)

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null
    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return

      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      scrollTimeout = setTimeout(() => {
        const mouseX = gsap.getProperty(cursorRef.current, 'x') as number
        const mouseY = gsap.getProperty(cursorRef.current, 'y') as number
        const elementUnderMouse = document.elementFromPoint(mouseX, mouseY)
        const isStillOverTarget =
          elementUnderMouse &&
          (elementUnderMouse === activeTarget ||
            elementUnderMouse.closest(targetSelector) === activeTarget)
        if (!isStillOverTarget) {
          currentLeaveHandler?.()
        }
      }, 100)
    }
    window.addEventListener('scroll', scrollHandler, { passive: true })

    const mouseDownHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.3 })
      gsap.to(cursorRef.current, { scale: 0.9, duration: 0.2 })
    }

    const mouseUpHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 1, duration: 0.3 })
      gsap.to(cursorRef.current, { scale: 1, duration: 0.2 })
    }

    window.addEventListener('mousedown', mouseDownHandler)
    window.addEventListener('mouseup', mouseUpHandler)

    const enterHandler = (e: MouseEvent) => {
      const directTarget = e.target as Element
      const allTargets: Element[] = []
      let current: Element | null = directTarget
      while (current && current !== document.body) {
        if (current.matches(targetSelector)) {
          allTargets.push(current)
        }
        current = current.parentElement
      }
      const target = allTargets[0] || null
      if (!target || !cursorRef.current || !cornersRef.current) return
      if (activeTarget === target) return
      if (activeTarget) {
        cleanupTarget(activeTarget)
      }
      if (resumeTimeout) {
        clearTimeout(resumeTimeout)
        resumeTimeout = null
      }

      activeTarget = target
      const corners = Array.from(cornersRef.current)
      corners.forEach((corner) => gsap.killTweensOf(corner))
      // stop idle beat while hovering
      beatTl.current?.kill()
      gsap.killTweensOf(cursorRef.current, 'rotation')
      gsap.set(cursorRef.current, { rotation: 0 })

      const rect = target.getBoundingClientRect()
      const { borderWidth, cornerSize } = constants
      const cursorX = gsap.getProperty(cursorRef.current, 'x') as number
      const cursorY = gsap.getProperty(cursorRef.current, 'y') as number

      // add a small offset so corners sit slightly outside the element edges
      const o = snapOffset
      targetCornerPositionsRef.current = [
        { x: rect.left - borderWidth - o, y: rect.top - borderWidth - o },
        {
          x: rect.right + borderWidth - cornerSize + o,
          y: rect.top - borderWidth - o,
        },
        {
          x: rect.right + borderWidth - cornerSize + o,
          y: rect.bottom + borderWidth - cornerSize + o,
        },
        {
          x: rect.left - borderWidth - o,
          y: rect.bottom + borderWidth - cornerSize + o,
        },
      ]

      isActiveRef.current = true
      gsap.ticker.add(tickerFnRef.current!)

      gsap.to(activeStrength, {
        current: 1,
        duration: hoverDuration,
        ease: 'power2.out',
      })

      corners.forEach((corner, i) => {
        gsap.to(corner, {
          x: targetCornerPositionsRef.current![i].x - cursorX,
          y: targetCornerPositionsRef.current![i].y - cursorY,
          duration: 0.2,
          ease: 'power2.out',
        })
      })

      const leaveHandler = () => {
        gsap.ticker.remove(tickerFnRef.current!)
        isActiveRef.current = false
        targetCornerPositionsRef.current = null
        gsap.set(activeStrength, { current: 0, overwrite: true })
        activeTarget = null
        if (cornersRef.current) {
          const corners = Array.from(cornersRef.current)
          gsap.killTweensOf(corners)
          const { cornerSize } = constants
          const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
          ]
          const tl = gsap.timeline()
          corners.forEach((corner, index) => {
            tl.to(
              corner,
              {
                x: positions[index].x,
                y: positions[index].y,
                duration: 0.3,
                ease: 'power3.out',
              },
              0
            )
          })
          // when the leave animation completes, restart beat timeline
          tl.call(() => {
            if (!activeTarget && cursorRef.current) {
              createBeatTimeline()
            }
          })
        }
        // previous timeout logic replaced by tl callback above
        resumeTimeout = null
        cleanupTarget(target)
      }
      currentLeaveHandler = leaveHandler
      target.addEventListener('mouseleave', leaveHandler)
    }

    window.addEventListener('mouseover', enterHandler as EventListener)

    return () => {
      if (tickerFnRef.current) {
        gsap.ticker.remove(tickerFnRef.current)
      }
      window.removeEventListener('mousemove', enhancedMoveHandler)
      window.removeEventListener('mouseover', enterHandler as EventListener)
      window.removeEventListener('scroll', scrollHandler)
      window.removeEventListener('mousedown', mouseDownHandler)
      window.removeEventListener('mouseup', mouseUpHandler)
      if (activeTarget) {
        cleanupTarget(activeTarget)
      }
      beatTl.current?.kill()
      document.body.style.cursor = originalCursor
      isActiveRef.current = false
      targetCornerPositionsRef.current = null
      activeStrength.current = 0
      if (tiltResetTimeoutRef.current) {
        clearTimeout(tiltResetTimeoutRef.current)
        tiltResetTimeoutRef.current = null
      }
    }
  }, [
    targetSelector,
    moveCursor,
    constants,
    hideDefaultCursor,
    isMobile,
    hoverDuration,
    parallaxOn,
    maxTiltAngle,
    createBeatTimeline,
    snapOffset,
    beatDuration,
  ])

  // if beatDuration changes we need to recreate timeline
  useEffect(() => {
    if (isMobile || !cursorRef.current) return
    if (beatTl.current) {
      createBeatTimeline()
    }
  }, [beatDuration, isMobile, createBeatTimeline])

  if (isMobile) {
    return null
  }

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-0 h-0 pointer-events-none z-9999"
      style={{ willChange: 'transform' }}
    >
      <div
        ref={dotRef}
        className="absolute top-1/2 left-1/2 w-1 h-1 bg-foreground rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border border-foreground -translate-x-[150%] -translate-y-[150%] border-r-0 border-b-0"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border border-foreground translate-x-1/2 -translate-y-[150%] border-l-0 border-b-0"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border border-foreground translate-x-1/2 translate-y-1/2 border-l-0 border-t-0"
        style={{ willChange: 'transform' }}
      />
      <div
        className="target-cursor-corner absolute top-1/2 left-1/2 w-3 h-3 border border-foreground -translate-x-[150%] translate-y-1/2 border-r-0 border-t-0"
        style={{ willChange: 'transform' }}
      />
    </div>
  )
}

export default TargetCursor
