'use client'

import { useRef, useState, useCallback } from 'react'
import type { ToastAPI } from './ToastProvider'
import type { Track } from './types'
import { CLIENT_MSG } from './messages'

/** Max automatic retries for audio playback errors before giving up. */
const MAX_AUDIO_RETRIES = 2

/** Stall timeout before showing a buffering warning (ms). */
const STALL_TIMEOUT_MS = 8000

interface UseAudioPlayerOptions {
  /** Function to build an R2 key from a Track. */
  r2Key: (track: Track) => string
  /** Toast API for user notifications. */
  toast: ToastAPI
}

export interface AudioPlayerState {
  streamUrl: string | null
  isBuffering: boolean
  audioRef: React.RefObject<HTMLAudioElement | null>
}

export interface AudioPlayerActions {
  /** Start streaming a track. */
  play: (track: Track) => void
  /** Stop streaming and reset state. */
  stop: () => void
  /** Handler for <audio> onError — bounded retries with session check. */
  handleError: (track: Track) => Promise<void>
  /** Handler for <audio> onStalled. */
  handleStalled: () => void
  /** Handler for <audio> onCanPlay / onPlaying — clears stall state. */
  clearStallTimer: () => void
  /** Handler for <audio> onCanPlay — restores position after retry. */
  handleCanPlay: () => void
  /** Handler for <audio> onWaiting. */
  handleWaiting: () => void
  /** Handler for <audio> onTimeUpdate — tracks current position. */
  handleTimeUpdate: () => void
}

/**
 * Encapsulates audio playback state, streaming URL management,
 * error recovery with bounded retries, and buffering/stall detection.
 */
export function useAudioPlayer({
  r2Key,
  toast,
}: UseAudioPlayerOptions): AudioPlayerState & AudioPlayerActions {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentTimeRef = useRef(0)
  const retryCountRef = useRef(0)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Play ----------------------------------------------------------------
  const play = useCallback(
    (track: Track) => {
      retryCountRef.current = 0
      currentTimeRef.current = 0
      setStreamUrl(`/api/access?file=${encodeURIComponent(r2Key(track))}`)
    },
    [r2Key]
  )

  // ---- Stop ----------------------------------------------------------------
  const stop = useCallback(() => {
    setStreamUrl(null)
    currentTimeRef.current = 0
    retryCountRef.current = 0
  }, [])

  // ---- Stall detection -----------------------------------------------------
  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }
  }, [])

  const handleStalled = useCallback(() => {
    if (stallTimerRef.current) return
    stallTimerRef.current = setTimeout(() => {
      stallTimerRef.current = null
      toast.show(CLIENT_MSG.AUDIO_STALL, 'warning')
    }, STALL_TIMEOUT_MS)
  }, [toast])

  // ---- Error handler (bounded retries with session check) ------------------
  const handleError = useCallback(
    async (track: Track) => {
      const audio = audioRef.current
      if (!audio) return

      // Probe the server to distinguish session/404 errors from codec issues
      try {
        const checkUrl = `/api/access?file=${encodeURIComponent(r2Key(track))}`
        const res = await fetch(checkUrl, { method: 'HEAD' })
        if (res.status === 401 || res.status === 403) {
          toast.show(CLIENT_MSG.AUDIO_SESSION_EXPIRED, 'error', {
            persistent: true,
          })
          setStreamUrl(null)
          return
        }
        if (res.status === 404) {
          toast.show(CLIENT_MSG.AUDIO_NOT_FOUND, 'error')
          setStreamUrl(null)
          return
        }
      } catch {
        // Network error — fall through to retry
      }

      // Format not supported
      const mediaErr = audio.error
      if (mediaErr?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        toast.show(CLIENT_MSG.AUDIO_UNSUPPORTED, 'error')
        setStreamUrl(null)
        return
      }

      // Retry limit reached
      if (retryCountRef.current >= MAX_AUDIO_RETRIES) {
        toast.show(CLIENT_MSG.AUDIO_GIVE_UP, 'error')
        setStreamUrl(null)
        return
      }

      retryCountRef.current++
      currentTimeRef.current = audio.currentTime
      toast.show(CLIENT_MSG.AUDIO_RECONNECTING, 'warning')

      // Force reload with cache-busting param
      const url = `/api/access?file=${encodeURIComponent(r2Key(track))}&t=${Date.now()}`
      setStreamUrl(url)
    },
    [r2Key, toast]
  )

  // ---- canPlay handler (restore position after retry) ----------------------
  const handleCanPlay = useCallback(() => {
    setIsBuffering(false)
    clearStallTimer()
    if (
      audioRef.current &&
      retryCountRef.current > 0 &&
      currentTimeRef.current > 0
    ) {
      audioRef.current.currentTime = currentTimeRef.current
      audioRef.current.play().catch(() => {
        toast.show(CLIENT_MSG.AUDIO_AUTOPLAY_BLOCKED, 'info')
      })
    }
  }, [clearStallTimer, toast])

  // ---- Simple event handlers -----------------------------------------------
  const handleWaiting = useCallback(() => setIsBuffering(true), [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      currentTimeRef.current = audioRef.current.currentTime
    }
  }, [])

  return {
    // State
    streamUrl,
    isBuffering,
    audioRef,
    // Actions
    play,
    stop,
    handleError,
    handleStalled,
    clearStallTimer,
    handleCanPlay,
    handleWaiting,
    handleTimeUpdate,
  }
}
