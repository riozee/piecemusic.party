'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { MDXContent } from '@/components/mdx-content'
import { useTurnstile } from '@/lib/useTurnstile'
import type { AlbumData, Track } from './types'

interface PortalInnerProps {
  data: AlbumData
  code: string
}

/* ------------------------------------------------------------------ */
/* Helper: resolve cover for a track (fallback to album cover)        */
/* ------------------------------------------------------------------ */
function trackCover(track: Track, fallback: string): string {
  return track.cover ?? fallback
}

/* ------------------------------------------------------------------ */
/* Sub-component: Credits sidebar (mirrors works/[slug] metadata)     */
/* ------------------------------------------------------------------ */
function TrackCredits({
  track,
  albumTitle,
}: {
  track: Track
  albumTitle: string
}) {
  const rows: [string, string | undefined][] = [
    ['リリース日', track.date],
    ['アーティスト', track.author],
    ['ボーカル', track.vocal],
    ['音楽', track.music],
    ['作詞', track.lyric],
    ['編曲', track.arrangement],
    ['イラスト', track.illust],
    ['動画', track.movie],
  ]

  return (
    <div className="font-mono text-sm space-y-3 border-l-2 border-foreground/50 pl-4 py-2">
      <div className="flex justify-between border-b border-foreground/20 pb-1">
        <span className="opacity-50">収録</span>
        <span>{albumTitle}</span>
      </div>
      {rows.map(
        ([label, value]) =>
          value && (
            <div
              key={label}
              className="flex justify-between border-b border-foreground/20 pb-1"
            >
              <span className="opacity-50">{label}</span>
              <span className="text-right">{value}</span>
            </div>
          )
      )}
      {/* Tags */}
      {track.tags && track.tags.length > 0 && (
        <div className="flex justify-between border-b border-foreground/20 pb-1">
          <span className="opacity-50">タグ</span>
          <span>{track.tags.map((t) => '#' + t).join(' ')}</span>
        </div>
      )}
      {/* External links */}
      {track.links && track.links.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {track.links.map((link) => (
            <Button key={link.url} href={link.url} variant="outline" size="sm">
              {link.label} &gt;
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-component: Custom audio player with slider + controls          */
/* ------------------------------------------------------------------ */
function AudioPlayer({
  streamUrl,
  audioRef,
  onError,
  onTimeUpdate,
}: {
  streamUrl: string
  audioRef: React.RefObject<HTMLAudioElement | null>
  onError: () => void
  onTimeUpdate: () => void
}) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(1)

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
    onTimeUpdate()
  }

  const handlePlay = () => setPlaying(true)
  const handlePause = () => setPlaying(false)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value)
    setCurrentTime(t)
    if (audioRef.current) audioRef.current.currentTime = t
  }

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  return (
    <div className="space-y-3">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={streamUrl}
        autoPlay
        onLoadedMetadata={handleLoaded}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={onError}
      />
      {/* Seek slider */}
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        onChange={seek}
        className="cursor-target w-full h-1 accent-primary-blue cursor-pointer appearance-none bg-foreground/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-blue"
      />
      {/* Time display */}
      <div className="flex items-center justify-between text-[10px] font-mono opacity-50">
        <span>{fmt(currentTime)}</span>
        <span>{duration ? fmt(duration) : '--:--'}</span>
      </div>
      {/* Controls row */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="cursor-target w-10 h-10 flex items-center justify-center border border-foreground/40 hover:border-primary-blue hover:bg-primary-blue/10 transition-colors cursor-pointer font-mono text-sm"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        {/* Volume */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-mono opacity-40">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={changeVolume}
            className="cursor-target flex-1 h-1 accent-primary-blue cursor-pointer appearance-none bg-foreground/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-blue"
          />
        </div>
      </div>
      <p className="text-[10px] font-mono opacity-30 text-center">
        ストリーミング再生中
      </p>
    </div>
  )
}

/* ================================================================== */
/* Main component                                                     */
/* ================================================================== */
export default function PortalInner({ data, code }: PortalInnerProps) {
  const { album, tracks } = data
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  const {
    containerRef: turnstileContainerRef,
    getToken,
    reset: resetTurnstile,
  } = useTurnstile({ size: 'invisible' })
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentTimeRef = useRef(0)

  const selected: Track | undefined =
    selectedIdx !== null ? tracks[selectedIdx] : undefined

  // ---- Download handler ----------------------------------------------------
  const handleDownload = useCallback(
    async (track: Track) => {
      setError(null)
      setDownloading(true)

      try {
        const token = await getToken()

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
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'ネットワークエラーが発生しました。'
        )
      } finally {
        resetTurnstile()
        setDownloading(false)
      }
    },
    [code, album.id, getToken, resetTurnstile]
  )

  // ---- Stream request (for <audio> playback) --------------------------------
  const requestStream = useCallback(
    async (track: Track): Promise<string | null> => {
      try {
        const token = await getToken()
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
        return body.streamUrl ?? null
      } catch {
        setError('ネットワークエラーが発生しました。')
        return null
      } finally {
        resetTurnstile()
      }
    },
    [code, album.id, getToken, resetTurnstile]
  )

  // ---- Play handler ---------------------------------------------------------
  const handlePlay = useCallback(
    async (track: Track) => {
      setError(null)
      const url = await requestStream(track)
      if (url) {
        currentTimeRef.current = 0
        setStreamUrl(url)
      }
    },
    [requestStream]
  )

  // ---- Audio error handler (auto-refresh expired ticket) --------------------
  const handleAudioError = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !selected) return

    if (
      audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
      audio.error?.code === MediaError.MEDIA_ERR_NETWORK
    ) {
      currentTimeRef.current = audio.currentTime

      requestStream(selected).then((url) => {
        if (url && audioRef.current) {
          setStreamUrl(url)
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
    currentTimeRef.current = 0
  }, [selectedIdx])

  // ---- Select a track (for mobile navigation) ------------------------------
  const openTrack = useCallback((idx: number) => {
    setSelectedIdx(idx)
    setError(null)
  }, [])

  const goBack = useCallback(() => {
    setSelectedIdx(null)
    setStreamUrl(null)
    setError(null)
  }, [])

  // ========================================================================
  // RENDER
  // ========================================================================

  // ---- Tracklist panel (shared between desktop sidebar & mobile list) ------
  const trackList = (
    <Card noHover className="p-0!">
      <div className="border-b border-foreground/20 px-4 py-3 flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0 border border-foreground/20 overflow-hidden">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="32px"
            className="object-cover"
          />
        </div>
        <div>
          <span className="text-xs font-mono font-bold">{album.title}</span>
          <span className="text-[10px] font-mono opacity-40 ml-2">
            {tracks.length} tracks
          </span>
        </div>
      </div>
      <ul className="divide-y divide-foreground/10 max-h-[70vh] overflow-y-auto">
        {tracks.map((track, idx) => (
          <li key={track.title}>
            <button
              onClick={() => openTrack(idx)}
              className={`cursor-target w-full text-left px-3 py-3 flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                idx === selectedIdx
                  ? 'bg-primary-blue/10 border-l-2 border-primary-blue'
                  : 'hover:bg-foreground/5 border-l-2 border-transparent'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-10 h-10 shrink-0 border border-foreground/20 overflow-hidden">
                <Image
                  src={trackCover(track, album.cover)}
                  alt={track.title}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono opacity-40">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-bold truncate">
                    {track.title}
                  </span>
                </div>
                {track.author && (
                  <p className="text-[10px] opacity-50 truncate">
                    {track.author}
                  </p>
                )}
              </div>
              {track.duration && (
                <span className="text-[10px] font-mono opacity-40 shrink-0">
                  {track.duration}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )

  // ---- Player panel --------------------------------------------------------
  const playerPanel = selected ? (
    <div className="space-y-6">
      {/* Cover art */}
      <div className="relative aspect-square w-full bg-foreground/5 border border-foreground/10 overflow-hidden">
        <Image
          src={trackCover(selected, album.cover)}
          alt={selected.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-mono text-2xl font-bold tracking-tight text-white drop-shadow-md">
            {selected.title}
          </p>
          {selected.author && (
            <p className="text-xs font-mono text-white/70 mt-1">
              {selected.author}
            </p>
          )}
        </div>
      </div>

      {/* Audio player / play button */}
      {streamUrl ? (
        <AudioPlayer
          streamUrl={streamUrl}
          audioRef={audioRef}
          onError={handleAudioError}
          onTimeUpdate={() => {
            if (audioRef.current) {
              currentTimeRef.current = audioRef.current.currentTime
            }
          }}
        />
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
    </div>
  ) : null

  // ---- Detail panel (credits + MDX + download) -----------------------------
  const detailPanel = selected ? (
    <div className="space-y-6">
      {/* Credits */}
      <TrackCredits track={selected} albumTitle={album.title} />

      {/* Download button */}
      {error && (
        <div className="text-sm text-primary-pink border border-primary-pink/30 bg-primary-pink/5 px-4 py-2 font-mono">
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={downloading}
        onClick={() => handleDownload(selected)}
      >
        {downloading ? 'ダウンロード中…' : 'ダウンロード'}
      </Button>

      {/* MDX body */}
      {selected.body && (
        <div className="prose dark:prose-invert max-w-none">
          <div className="bg-card-bg/50 p-6 border border-foreground/10 backdrop-blur-sm shadow-sm">
            <MDXContent code={selected.body} />
          </div>
        </div>
      )}
    </div>
  ) : null

  // ========================================================================
  // DESKTOP layout (3-column)
  // ========================================================================
  const desktopLayout = (
    <div className="hidden md:grid md:grid-cols-12 gap-6">
      {/* Left: tracklist */}
      <aside className="col-span-3">{trackList}</aside>

      {/* Middle: player */}
      <div className="col-span-4">
        {playerPanel ?? (
          <Card noHover>
            <p className="text-sm opacity-50 font-mono text-center py-12">
              トラックを選択してください。
            </p>
          </Card>
        )}
      </div>

      {/* Right: credits + MDX + download */}
      <div className="col-span-5">
        {detailPanel ?? (
          <Card noHover>
            <p className="text-sm opacity-50 font-mono text-center py-12">
              &nbsp;
            </p>
          </Card>
        )}
      </div>
    </div>
  )

  // ========================================================================
  // MOBILE layout (2-screen SPA)
  // ========================================================================
  const mobileLayout = (
    <div className="md:hidden">
      {selectedIdx === null ? (
        /* Screen 1: tracklist */
        trackList
      ) : (
        /* Screen 2: track detail */
        <div className="space-y-6">
          <button
            onClick={goBack}
            className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            &lt; トラック一覧に戻る
          </button>

          {playerPanel}
          {detailPanel}
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Album header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-14 h-14 shrink-0 border border-foreground/20 overflow-hidden">
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes="56px"
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

      {desktopLayout}
      {mobileLayout}

      {/* Hidden Turnstile container */}
      <div
        ref={turnstileContainerRef}
        className="fixed bottom-0 left-0 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}
