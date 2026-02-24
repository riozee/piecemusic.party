'use client'

import { useEffect } from 'react'

interface ToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 1500) // you must edit the globals.css too
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-500" />

      {/* Toast */}
      <div className="fixed top-1/2 -translate-y-1/2 animate-toast z-50">
        <div className="bg-background border border-foreground p-4 flex items-center gap-3 min-w-75">
          <div className="w-1 h-1 bg-primary-green animate-pulse" />
          <span className="font-mono font-bold text-foreground text-sm uppercase tracking-widest">
            {message}
          </span>
        </div>
      </div>
    </div>
  )
}
