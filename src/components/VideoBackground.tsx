'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { registerSourceVideo } from '@/lib/videoSync'

interface VideoBackgroundProps {
  src: string
  className?: string
  opacity?: number
}

export default function VideoBackground({
  src,
  className = '',
  opacity = 0.5,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const tryPlay = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.paused) return
    v.play().catch(() => {})
  }, [])

  useEffect(() => {
    registerSourceVideo(videoRef.current)
    return () => registerSourceVideo(null)
  }, [])

  // Re-play whenever the tab comes back into view (handles tab-switch / app
  // background on mobile) and after the first user gesture (unblocks autoplay
  // on browsers that require interaction before playing muted video).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) tryPlay()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    // Once-only: the first pointer interaction can unblock autoplay on stricter
    // mobile browsers.
    document.addEventListener('pointerdown', tryPlay, { once: true })
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('pointerdown', tryPlay)
    }
  }, [tryPlay])

  return (
    <div
      id="video-background"
      aria-hidden="true"
      className={`fixed inset-0 -z-50 overflow-hidden pointer-events-none md:ml-18 transition-[margin-left] duration-700 ease-in-out ${className}`}
      style={{ opacity }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
        onCanPlay={(e) => {
          e.currentTarget.play().catch(() => {})
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  )
}
