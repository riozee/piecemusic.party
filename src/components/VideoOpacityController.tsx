'use client'

import { useEffect } from 'react'

const OPACITY_TOP = 0.95 // opacity at scroll position 0
const OPACITY_DEFAULT = 0.5 // opacity once scrolled past threshold
const SCROLL_THRESHOLD = 200 // px of scroll to complete the transition

export default function VideoOpacityController() {
  useEffect(() => {
    const el = document.getElementById('video-background') as HTMLElement | null
    if (!el) return

    const update = () => {
      const t = Math.min(window.scrollY / SCROLL_THRESHOLD, 1)
      el.style.opacity = String(
        OPACITY_TOP + (OPACITY_DEFAULT - OPACITY_TOP) * t
      )
    }

    update()
    window.addEventListener('scroll', update, { passive: true })

    return () => {
      window.removeEventListener('scroll', update)
      // Restore the component's own default when leaving the root page
      el.style.opacity = String(OPACITY_DEFAULT)
    }
  }, [])

  return null
}
