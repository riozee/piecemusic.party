'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import Card from '@/components/Card'
import Button from '@/components/Button'
import type { AlbumData, Track } from './types'

const TURNSTILE_SITE_KEY = '0x4AAAAAAC0hXP71wg9xv4ji'

interface PortalInnerProps {
  data: AlbumData
  code: string
}

/**
 * The unlocked portal interior — split layout with a sidebar tracklist and
 * a main area showing the selected track with metadata + download button.
 */
export default function PortalInner({ data, code }: PortalInnerProps) {
  const { album, tracks } = data
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Track Turnstile token for download requests
  const tokenRef = useRef<string | null>(null)
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentTimeRef = useRef(0)

  const selected: Track | undefined = tracks[selectedIdx]

  // ---- Turnstile (hidden, auto-refresh for download tokens) ----------------
  useEffect(() => {
    function tryRender() {
      const ts = (
        window as unknown as Record<
          string,
          {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string
            remove: (id: string) => void
          }
        >
      ).turnstile

      if (!ts || !turnstileContainerRef.current) return

      // Remove existing widget if re-rendering
      if (widgetIdRef.current !== null) {
        ts.remove(widgetIdRef.current)
      }

      widgetIdRef.current = ts.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        // execution:'execute' keeps the widget dormant until ts.execute() is
        // called explicitly, so no token is generated until the user acts.
        execution: 'execute',
        callback: (token: string) => {
          tokenRef.current = token
        },
        'expired-callback': () => {
          tokenRef.current = null
        },
        'error-callback': () => {
          tokenRef.current = null
        },
        size: 'invisible',
        theme: 'dark',
      })
    }

    // Turnstile SDK may already be loaded from the Gate step
    const SCRIPT_ID = 'cf-turnstile-script'
    if (document.getElementById(SCRIPT_ID)) {
      // Wait a tick for the SDK to initialise
      const timer = setTimeout(tryRender, 300)
      return () => clearTimeout(timer)
    }

    // Load if somehow not already present
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoadInner'
    script.async = true
    ;(window as unknown as Record<string, unknown>).onTurnstileLoadInner =
      tryRender
    document.head.appendChild(script)

    return () => {
      const ts2 = (
        window as unknown as Record<string, { remove: (id: string) => void }>
      ).turnstile
      if (ts2 && widgetIdRef.current !== null) {
        ts2.remove(widgetIdRef.current)
      }
    }
  }, [])

  // ---- Refresh token helper (always requests a fresh token on demand) ------
  const refreshToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const ts = (
        window as unknown as Record<string, { execute: (id: string) => void }>
      ).turnstile

      if (!ts || widgetIdRef.current === null) {
        reject(new Error('Turnstile widget not ready'))
        return
      }

      // Always discard any stale token before triggering a fresh challenge
      tokenRef.current = null
      ts.execute(widgetIdRef.current)

      // Poll for the fresh token (max ~5 s)
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (tokenRef.current) {
          clearInterval(interval)
          resolve(tokenRef.current)
        } else if (attempts > 25) {
          clearInterval(interval)
          reject(new Error('Turnstile token timeout'))
        }
      }, 200)
    })
  }, [])

  // ---- Download handler ----------------------------------------------------
  const handleDownload = useCallback(
    async (track: Track) => {
      setError(null)
      setDownloading(true)

      try {
        const token = await refreshToken()

        const res = await fetch('/api/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            album_id: album.id,
            filename: track.filename,
            token,
            action: 'download',
          }),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setError(body.error ?? `ダウンロードに失敗しました (${res.status})`)
          return
        }

        // Trigger browser download from blob
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = track.filename.split('/').pop() ?? 'download'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)

        // Invalidate the consumed token so next download gets a fresh one
        tokenRef.current = null
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'ネットワークエラーが発生しました。'
        )
      } finally {
        setDownloading(false)
      }
    },
    [code, album.id, refreshToken]
  )

  // ---- Stream request (for <audio> playback) --------------------------------
  const requestStream = useCallback(
    async (track: Track): Promise<string | null> => {
      try {
        const token = await refreshToken()
        const res = await fetch('/api/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            album_id: album.id,
            filename: track.filename,
            token,
            action: 'stream',
          }),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setError(body.error ?? `ストリーミングに失敗しました (${res.status})`)
          return null
        }

        const body = (await res.json()) as { streamUrl?: string }
        tokenRef.current = null
        return body.streamUrl ?? null
      } catch {
        setError('ネットワークエラーが発生しました。')
        return null
      }
    },
    [code, album.id, refreshToken]
  )

  // ---- Play handler ---------------------------------------------------------
  const handlePlay = useCallback(
    async (track: Track) => {
      setError(null)
      const url = await requestStream(track)
      if (url) {
        currentTimeRef.current = 0
        setStreamUrl(url)
        setIsPlaying(true)
      }
    },
    [requestStream]
  )

  // ---- Audio error handler (auto-refresh expired ticket) --------------------
  const handleAudioError = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !selected) return

    // MediaError code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (also fires on network 403)
    if (
      audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
      audio.error?.code === MediaError.MEDIA_ERR_NETWORK
    ) {
      // Save playback position
      currentTimeRef.current = audio.currentTime

      // Silently refresh the stream ticket
      requestStream(selected).then((url) => {
        if (url && audioRef.current) {
          setStreamUrl(url)
          // Wait for source to load before resuming
          audioRef.current.addEventListener(
            'canplay',
            () => {
              if (audioRef.current) {
                audioRef.current.currentTime = currentTimeRef.current
                audioRef.current.play().catch(() => {})
              }
            },
            { once: true }
          )
        }
      })
    }
  }, [selected, requestStream])

  // Reset stream when track changes
  useEffect(() => {
    setStreamUrl(null)
    setIsPlaying(false)
    currentTimeRef.current = 0
  }, [selectedIdx])

  return (
    <div className="space-y-6">
      {/* Album header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="relative w-16 h-16 shrink-0 border border-foreground/20 overflow-hidden">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono leading-tight">
            {album.title}
          </h1>
          <p className="text-xs opacity-60 mt-1">{album.description}</p>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar: tracklist */}
        <aside className="md:w-72 shrink-0">
          <Card noHover className="p-0!">
            <div className="border-b border-foreground/20 px-4 py-3">
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">
                Tracklist — {tracks.length} tracks
              </span>
            </div>
            <ul className="divide-y divide-foreground/10 max-h-[60vh] overflow-y-auto">
              {tracks.map((track, idx) => (
                <li key={track.filename}>
                  <button
                    onClick={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-4 py-3 transition-colors duration-150 cursor-pointer ${
                      idx === selectedIdx
                        ? 'bg-primary-blue/10 border-l-2 border-primary-blue'
                        : 'hover:bg-foreground/5 border-l-2 border-transparent'
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-40 mr-2">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-bold">{track.title}</span>
                    {track.duration && (
                      <span className="text-[10px] font-mono opacity-40 ml-2">
                        {track.duration}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card noHover className="space-y-6">
              {/* Media display area */}
              <div className="relative aspect-video w-full bg-foreground/5 border border-foreground/10 flex items-center justify-center overflow-hidden">
                <Image
                  src={album.cover}
                  alt={selected.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover opacity-30"
                />
                <div className="relative z-10 text-center px-4">
                  <p className="font-mono text-4xl font-bold tracking-tight">
                    {selected.title}
                  </p>
                  {selected.duration && (
                    <p className="text-xs font-mono opacity-50 mt-2">
                      {selected.duration}
                    </p>
                  )}
                </div>
              </div>

              {/* Track metadata */}
              <div>
                <h2 className="text-lg font-bold font-mono mb-1">
                  {selected.title}
                </h2>
                {selected.description && (
                  <p className="text-sm opacity-70 leading-relaxed">
                    {selected.description}
                  </p>
                )}
                <p className="text-[10px] font-mono opacity-30 mt-2 break-all">
                  {selected.filename}
                </p>
              </div>

              {/* Audio player */}
              {streamUrl ? (
                <div className="space-y-2">
                  <audio
                    ref={audioRef}
                    src={streamUrl}
                    controls
                    autoPlay
                    onError={handleAudioError}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        currentTimeRef.current = audioRef.current.currentTime
                      }
                    }}
                    className="w-full"
                  />
                  <p className="text-[10px] font-mono opacity-30 text-center">
                    ストリーミング再生中 — チケットは5分間有効です（自動更新）
                  </p>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => handlePlay(selected)}
                >
                  ▶ 再生
                </Button>
              )}

              {/* Error */}
              {error && (
                <div className="text-sm text-primary-pink border border-primary-pink/30 bg-primary-pink/5 px-4 py-2 font-mono">
                  {error}
                </div>
              )}

              {/* Download button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={downloading}
                onClick={() => handleDownload(selected)}
              >
                {downloading ? 'ダウンロード中…' : 'ダウンロード'}
              </Button>
            </Card>
          ) : (
            <Card noHover>
              <p className="text-sm opacity-50 font-mono">
                トラックを選択してください。
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Hidden Turnstile container for invisible token refresh */}
      <div
        ref={turnstileContainerRef}
        className="fixed bottom-0 left-0 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}
