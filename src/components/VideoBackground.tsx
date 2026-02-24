'use client'

import React from 'react'

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
  return (
    <div
      className={`fixed inset-0 -z-50 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full object-cover"
        // Ensure the video loads and plays automatically
        onCanPlay={(e) => {
          e.currentTarget.play().catch(() => {
            // Silently catch autoplay errors (e.g., interaction requirements)
          })
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
