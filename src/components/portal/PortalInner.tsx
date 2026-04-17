'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { MDXContent } from '@/components/mdx-content'
import type { AlbumData, Track } from './types'

interface PortalInnerProps {
  data: AlbumData
}

/** Max automatic retries for audio playback errors before giving up. */
const MAX_AUDIO_RETRIES = 2

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

/* ================================================================== */
/* Main component                                                     */
/* ================================================================== */
export default function PortalInner({ data }: PortalInnerProps) {
  const { album, tracks } = data
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const currentTimeRef = useRef(0)
  const retryCountRef = useRef(0)

  const selected: Track | undefined =
    selectedIdx !== null ? tracks[selectedIdx] : undefined

  // ---- Build R2 key from album ID + bare filename -------------------------
  const r2Key = useCallback(
    (track: Track) => `${album.id}/${track.filename}`,
    [album.id]
  )

  // ---- Download handler (signed-URL via <a download>, no blob) -----------
  const handleDownload = useCallback(
    (track: Track) => {
      setError(null)
      const url = `/api/access?file=${encodeURIComponent(r2Key(track))}&dl=1`
      const a = document.createElement('a')
      a.href = url
      a.download = track.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
    [r2Key]
  )

  // ---- Play handler (direct URL, cookie-authenticated) ---------------------
  const handlePlay = useCallback(
    (track: Track) => {
      setError(null)
      retryCountRef.current = 0
      currentTimeRef.current = 0
      setStreamUrl(`/api/access?file=${encodeURIComponent(r2Key(track))}`)
    },
    [r2Key]
  )

  // ---- Audio error handler (bounded retries) --------------------------------
  const handleAudioError = useCallback(() => {
    const audio = audioRef.current
    if (!audio || selectedIdx === null) return

    const track = tracks[selectedIdx]
    if (!track) return

    if (retryCountRef.current >= MAX_AUDIO_RETRIES) {
      setError(
        '再生エラーが発生しました。ページを再読み込みして再度お試しください。'
      )
      setStreamUrl(null)
      return
    }

    retryCountRef.current++
    currentTimeRef.current = audio.currentTime

    // Force reload with a cache-busting param
    const url = `/api/access?file=${encodeURIComponent(r2Key(track))}&t=${Date.now()}`
    setStreamUrl(url)
  }, [selectedIdx, tracks, r2Key])

  // ---- Select a track (for mobile navigation) ------------------------------
  const openTrack = useCallback((idx: number) => {
    setSelectedIdx(idx)
    setError(null)
    setStreamUrl(null)
    currentTimeRef.current = 0
    retryCountRef.current = 0
  }, [])

  const goBack = useCallback(() => {
    setSelectedIdx(null)
    setStreamUrl(null)
    setError(null)
    currentTimeRef.current = 0
    retryCountRef.current = 0
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

      {/* Audio controls / play button — the actual <audio> element is rendered
           once at the component root to avoid duplicate playback. */}
      {streamUrl ? (
        <p className="text-[10px] font-mono opacity-30 text-center py-2">
          ストリーミング再生中
        </p>
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
        onClick={() => handleDownload(selected)}
      >
        ダウンロード
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

      {/* Single <audio> element — rendered once here to prevent the desktop
           and mobile layouts from each mounting their own instance and
           playing simultaneously. */}
      {streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          controls
          autoPlay
          onError={handleAudioError}
          onCanPlay={() => {
            // Only restore position after an error-triggered reload (retryCountRef > 0).
            // canplay also fires on every normal seek/buffer, so guarding with
            // retryCountRef prevents seeking from being cancelled in a loop.
            if (audioRef.current && retryCountRef.current > 0 && currentTimeRef.current > 0) {
              audioRef.current.currentTime = currentTimeRef.current
              audioRef.current.play().catch(() => {})
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) {
              currentTimeRef.current = audioRef.current.currentTime
            }
          }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(90vw,480px)] z-50 shadow-lg"
        />
      )}
    </div>
  )
}
