'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ThemeAwareLogo from './ThemeAwareLogo'
import { ChevronDown, Loader2 } from 'lucide-react'

// ── Tune these ───────────────────────────────────────────────────────────────

/** Total accumulated wheel-delta (px) to run through all phases */
const SEQUENCE_TOTAL = 2400

/** Must match the `opacity` prop on <VideoBackground> in layout.tsx */
const VIDEO_BG_INITIAL_OPACITY = 0.5

/** Page scroll % (0–1) at which the bottom hint springs up */
const HINT_SCROLL_PCT = 0.99

/** Source of the high-quality video loaded lazily during the sequence */
const NEW_VIDEO_SRC = '/static/background-noblur.mp4'

/**
 * Phase-end thresholds as a fraction of SEQUENCE_TOTAL.
 *
 * FADE_END  – page fully transparent, blur-bg at full opacity
 * VIDEO_END – new video overlay fully opaque (logo is visible throughout this phase)
 * HOLD_END  – hold ends → start blackout
 * BLACK_END – pitch-black → reset
 */
const PHASE = {
  FADE_END: 0.25,
  VIDEO_END: 0.58,
  HOLD_END: 0.76,
  BLACK_END: 0.93,
} as const

// ────────────────────────────────────────────────────────────────────────────

export default function ScrollEndSequence() {
  const hintRef = useRef<HTMLDivElement>(null)
  const hintTextRef = useRef<HTMLSpanElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const logoWrapRef = useRef<HTMLDivElement>(null)
  const logoImgRef = useRef<HTMLDivElement>(null)
  const spinnerRef = useRef<HTMLDivElement>(null)
  const newVideoBgRef = useRef<HTMLDivElement>(null)
  const newVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const hint = hintRef.current!
    const hintText = hintTextRef.current!
    const overlay = overlayRef.current!
    const logoWrap = logoWrapRef.current!
    const logoImg = logoImgRef.current!
    const spinner = spinnerRef.current!
    const newVideoBg = newVideoBgRef.current!
    const newVideo = newVideoRef.current!

    const pageFade = document.getElementById('page-fade-wrapper')
    const videoBg = document.getElementById('video-background')

    // ── Initial GSAP states ──────────────────────────────────────────────────
    gsap.set(hint, { autoAlpha: 0, y: 64 })
    gsap.set(overlay, { autoAlpha: 0 })
    gsap.set(logoWrap, { autoAlpha: 0 })
    gsap.set(logoImg, { y: 200 })
    gsap.set(spinner, { autoAlpha: 0, y: 20 })
    gsap.set(newVideoBg, { opacity: 0 })

    // ── Mutable state ────────────────────────────────────────────────────────
    const s = {
      hintVisible: false,
      sequenceActive: false,
      syntheticDelta: 0,
      logoIn: false,
      resetting: false,
      videoLoaded: false,
      videoLoading: false,
      spinnerIn: false,
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    const getScrollPct = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return max <= 0 ? 1 : window.scrollY / max
    }

    const lockScroll = () => {
      document.body.style.overflow = 'hidden'
    }
    const unlockScroll = () => {
      document.body.style.overflow = ''
    }

    const setPageOpacity = (v: number) => {
      if (pageFade) pageFade.style.opacity = String(v)
    }
    const setVideoOpacity = (v: number) => {
      if (videoBg) videoBg.style.opacity = String(v)
    }
    const setNewVideoOpacity = (v: number) => {
      newVideoBg.style.opacity = String(v)
    }

    const BASE_HINT_TEXT = 'もうちょっとスクロールしてみて！'
    const setHintText = (pct?: number) => {
      hintText.textContent =
        pct === undefined
          ? BASE_HINT_TEXT
          : `${BASE_HINT_TEXT} (${(pct * (100 / 93)).toFixed(1)}%)`
    }

    // ── Full reset — shared by cancel and pitch-black end ────────────────────

    const fullReset = (scrollToTop: boolean) => {
      setPageOpacity(1)
      setVideoOpacity(VIDEO_BG_INITIAL_OPACITY)
      setNewVideoOpacity(0)
      gsap.set(hint, { autoAlpha: 0, y: 64 })
      gsap.set(overlay, { autoAlpha: 0 })
      gsap.set(logoWrap, { autoAlpha: 0 })
      gsap.set(logoImg, { y: 200 })
      gsap.set(spinner, { autoAlpha: 0, y: 20 })
      setHintText()

      // Stop and unload the new video to free bandwidth if interrupted
      newVideo.pause()
      newVideo.removeAttribute('src')
      newVideo.load()

      s.logoIn = false
      s.syntheticDelta = 0
      s.videoLoaded = false
      s.videoLoading = false
      s.spinnerIn = false

      // Restore video background margin
      if (videoBg) {
        videoBg.classList.remove('md:ml-0')
        videoBg.classList.add('md:ml-18')
      }

      unlockScroll()
      s.sequenceActive = false

      if (scrollToTop) {
        // Snap to top — hint is hidden, scroll watcher will re-arm naturally
        s.hintVisible = false
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      } else {
        // Cancel (stay at bottom) — mark hint as "already visible" so the
        // scroll watcher doesn't immediately re-animate it back in.
        // The next tick where pct < HINT_SCROLL_PCT will cleanly hide it.
        s.hintVisible = true
      }
    }

    // Cancels the sequence and leaves the user at the natural page bottom
    const cancelSequence = () => fullReset(false)

    // ── Sequence driver ──────────────────────────────────────────────────────

    const runSequence = (delta: number) => {
      if (s.resetting) return

      // Upscroll past virtual zero → cancel
      if (s.syntheticDelta + delta < 0) {
        cancelSequence()
        return
      }

      // Freeze forward delta during the loading gate (after FADE_END, while !videoLoaded)
      const raw = s.syntheticDelta + delta
      const frozen =
        delta > 0 && !s.videoLoaded && raw / SEQUENCE_TOTAL > PHASE.FADE_END
      s.syntheticDelta = frozen
        ? SEQUENCE_TOTAL * PHASE.FADE_END
        : Math.min(raw, SEQUENCE_TOTAL * (PHASE.BLACK_END + 0.05))

      const progress = s.syntheticDelta / SEQUENCE_TOTAL

      // Always update bottom hint text with current virtual progress
      setHintText(Math.round(progress * 100))

      // ── Phase 1: fade page out, blur-bg in ──────────────────────────────
      if (progress <= PHASE.FADE_END) {
        const t = progress / PHASE.FADE_END
        setPageOpacity(1 - t)
        setVideoOpacity(
          VIDEO_BG_INITIAL_OPACITY + (1 - VIDEO_BG_INITIAL_OPACITY) * t
        )
        setNewVideoOpacity(0)

        // Scroll-back cleanup
        if (s.logoIn) {
          gsap.set(logoWrap, { autoAlpha: 0 })
          gsap.set(logoImg, { y: 200 })
          s.logoIn = false
        }
        if (s.spinnerIn) {
          gsap.to(spinner, { autoAlpha: 0, duration: 0.25 })
          s.spinnerIn = false
        }
        if ((gsap.getProperty(overlay, 'opacity') as number) > 0) {
          gsap.set(overlay, { autoAlpha: 0 })
        }
        return
      }

      // ── Loading gate: freeze here until video is ready ───────────────────
      if (!s.videoLoaded) {
        setPageOpacity(0)
        setVideoOpacity(1)

        if (!s.spinnerIn) {
          s.spinnerIn = true
          gsap.to(spinner, {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: 'back.out(1.5)',
          })
        }
        // Upscroll is still handled by the < 0 check above; forward delta is frozen.
        return
      }

      // Video is loaded — ensure spinner is gone
      if (s.spinnerIn) {
        gsap.to(spinner, { autoAlpha: 0, duration: 0.25 })
        s.spinnerIn = false
      }

      // ── Phase 2: new video fades in, logo rises simultaneously ───────────
      if (progress <= PHASE.VIDEO_END) {
        const t =
          (progress - PHASE.FADE_END) / (PHASE.VIDEO_END - PHASE.FADE_END)
        setNewVideoOpacity(Math.min(t, 1))
        setPageOpacity(0)
        setVideoOpacity(1)

        if (!s.logoIn) {
          s.logoIn = true
          gsap.set(logoWrap, { autoAlpha: 1 })
          gsap.to(logoImg, { y: 0, duration: 0.5, ease: 'back.out(2.2)' })
        }
        if ((gsap.getProperty(overlay, 'opacity') as number) > 0) {
          gsap.set(overlay, { autoAlpha: 0 })
        }
        return
      }

      // ── Phase 3: hold — new video fully visible ──────────────────────────
      if (progress <= PHASE.HOLD_END) {
        setNewVideoOpacity(1)
        setPageOpacity(0)
        setVideoOpacity(1)

        if (!s.logoIn) {
          s.logoIn = true
          gsap.set(logoWrap, { autoAlpha: 1 })
          gsap.set(logoImg, { y: 0 })
        }
        // Scroll-back from blackout: clear overlay
        if ((gsap.getProperty(overlay, 'opacity') as number) > 0) {
          gsap.set(overlay, { autoAlpha: 0 })
        }
        return
      }

      // ── Phase 4: fade to black ───────────────────────────────────────────
      if (progress <= PHASE.BLACK_END) {
        const t =
          (progress - PHASE.HOLD_END) / (PHASE.BLACK_END - PHASE.HOLD_END)
        gsap.set(overlay, { autoAlpha: Math.min(t, 1) })

        // Ensure logo is visible even if user fast-scrolled here
        if (!s.logoIn) {
          s.logoIn = true
          gsap.set(logoWrap, { autoAlpha: 1 })
          gsap.set(logoImg, { y: 0 })
        }
        return
      }

      // ── Phase 5: pitch-black reset ───────────────────────────────────────
      if (!s.resetting) {
        s.resetting = true
        gsap.set(overlay, { autoAlpha: 1 })

        // Two nested rAFs: guarantee the black frame is painted before
        // the scroll position is teleported back to the top.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            fullReset(true)
            setTimeout(() => {
              s.resetting = false
            }, 400)
          })
        )
      }
    }

    // ── Video load handler ───────────────────────────────────────────────────

    const onVideoCanPlay = () => {
      if (s.videoLoaded) return
      s.videoLoaded = true
      newVideo.play().catch(() => {})
      // Re-run with delta 0 so the sequence immediately advances past the gate
      runSequence(0)
    }

    const startVideoLoad = () => {
      if (s.videoLoading || s.videoLoaded) return
      s.videoLoading = true
      newVideo.src = NEW_VIDEO_SRC
      newVideo.load()
    }

    newVideo.addEventListener('canplay', onVideoCanPlay)

    // ── Scroll watcher — shows hint and arms the sequence at page bottom ─────

    let scrollTicking = false
    const onScroll = () => {
      if (s.sequenceActive || s.resetting || scrollTicking) return
      scrollTicking = true
      requestAnimationFrame(() => {
        scrollTicking = false
        if (s.sequenceActive) return

        const pct = getScrollPct()

        if (pct >= HINT_SCROLL_PCT && !s.hintVisible) {
          s.hintVisible = true
          gsap.to(hint, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'elastic.out(1, 0.8)',
          })
        } else if (pct < HINT_SCROLL_PCT && s.hintVisible) {
          s.hintVisible = false
          gsap.to(hint, {
            autoAlpha: 0,
            y: 64,
            duration: 0.3,
            ease: 'power2.in',
          })
        }

        // Arms the sequence at true bottom (100 %)
        if (pct >= 1) {
          s.sequenceActive = true
          s.hintVisible = true // hint stays visible through the whole sequence
          lockScroll()
          startVideoLoad() // begin loading as soon as sequence arms
          // Slide video background to full width
          if (videoBg) {
            videoBg.classList.remove('md:ml-18')
            videoBg.classList.add('md:ml-0')
          }
          runSequence(0) // init phase 1; next wheel tick drives it forward
        }
      })
    }

    // ── Wheel driver ─────────────────────────────────────────────────────────

    const onWheel = (e: WheelEvent) => {
      if (!s.sequenceActive || s.resetting) return
      e.preventDefault()
      runSequence(e.deltaY)
    }

    // ── Touch driver ─────────────────────────────────────────────────────────

    let touchPrevY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchPrevY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!s.sequenceActive || s.resetting) return
      e.preventDefault()
      const dy = touchPrevY - e.touches[0].clientY
      touchPrevY = e.touches[0].clientY
      runSequence(dy * 1.8)
    }

    // ── Keyboard driver ───────────────────────────────────────────────────────

    const onKeyDown = (e: KeyboardEvent) => {
      if (!s.sequenceActive || s.resetting) return
      const step =
        e.key === ' ' || e.key === 'PageDown'
          ? 300
          : e.key === 'ArrowDown'
            ? 80
            : e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)
              ? -300
              : e.key === 'ArrowUp'
                ? -80
                : 0
      if (step) {
        e.preventDefault()
        runSequence(step)
      }
    }

    // ── Register ─────────────────────────────────────────────────────────────

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
      newVideo.removeEventListener('canplay', onVideoCanPlay)
      unlockScroll()
      setPageOpacity(1)
      setVideoOpacity(VIDEO_BG_INITIAL_OPACITY)
      if (videoBg) {
        videoBg.classList.remove('md:ml-0')
        videoBg.classList.add('md:ml-18')
      }
    }
  }, [])

  // ── JSX ──────────────────────────────────────────────────────────────────────
  // All elements are siblings of #page-fade-wrapper — never inside its opacity
  // stacking context.

  return (
    <>
      {/* ── Bottom hint (springs up at 99 % scroll, stays through whole sequence) */}
      <div
        ref={hintRef}
        className="fixed bottom-8 bg-primary-orange/15 rounded-lg left-1/2 -translate-x-1/2 z-100 flex flex-col items-center gap-1 pointer-events-none select-none"
        aria-hidden="true"
      >
        <span
          ref={hintTextRef}
          className="font-dot-gothic text-sm tracking-widest text-foreground font-bold rounded-md px-2 py-1"
        >
          もうちょっとスクロールしてみて！
        </span>
        <ChevronDown className="text-foreground animate-bounce" size={18} />
      </div>

      {/* ── Loading spinner (shown while background-noblur.mp4 downloads) ── */}
      <div
        ref={spinnerRef}
        className="fixed bottom-16 left-1/2 -translate-x-1/2 z-85 pointer-events-none select-none"
        aria-hidden="true"
      >
        <Loader2 className="text-foreground animate-spin" size={20} />
      </div>

      {/* ── New lazy video background (phase 2) ──────────────────────────── */}
      <div
        ref={newVideoBgRef}
        className="fixed inset-0 z-80 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* no src — set programmatically only when sequence arms */}
        <video
          ref={newVideoRef}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
        />
      </div>

      {/* ── Black overlay (phase 4) ──────────────────────────────────────── */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-95 bg-background pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Logo + repeat hint (phases 2–3) ──────────────────────────────── */}
      <div
        ref={logoWrapRef}
        className="fixed inset-0 z-90 flex flex-col items-center justify-center gap-8 pointer-events-none select-none"
        aria-hidden="true"
      >
        {/* Slides up from below when phase 2 starts */}
        <div ref={logoImgRef}>
          <ThemeAwareLogo
            width={220}
            height={110}
            className="drop-shadow-[0_0_48px_rgba(74,197,255,0.25)]"
          />
        </div>
      </div>
    </>
  )
}
