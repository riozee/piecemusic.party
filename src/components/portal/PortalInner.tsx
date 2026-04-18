'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { MDXContent } from '@/components/mdx-content'
import { useToast } from './ToastProvider'
import TrackList from './TrackList'
import TrackCredits from './TrackCredits'
import { useAudioPlayer } from './useAudioPlayer'
import { CLIENT_MSG } from './messages'
import type { AlbumData, Track } from './types'

interface PortalInnerProps {
  data: AlbumData
}

/** Resolve cover for a track (fallback to album cover). */
function trackCover(track: Track, fallback: string): string {
  return track.cover ?? fallback
}

/* ================================================================== */
/* Main component                                                     */
/* ================================================================== */

export default function PortalInner({ data }: PortalInnerProps) {
  const { album, tracks } = data
  const toast = useToast()
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const selected: Track | undefined =
    selectedIdx !== null ? tracks[selectedIdx] : undefined

  // ---- Build R2 key from album ID + bare filename -------------------------
  const r2Key = useCallback(
    (track: Track) => `${album.id}/${track.filename}`,
    [album.id]
  )

  // ---- Audio player (extracted hook) --------------------------------------
  const audio = useAudioPlayer({ r2Key, toast })

  // ---- Download handler (fetch + blob for proper error handling) ----------
  const handleDownload = useCallback(
    async (track: Track) => {
      if (!navigator.onLine) {
        toast.show(CLIENT_MSG.OFFLINE, 'warning')
        return
      }
      setIsDownloading(true)
      const url = `/api/access?file=${encodeURIComponent(r2Key(track))}&dl=1`

      try {
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 401) {
            toast.show(CLIENT_MSG.SESSION_EXPIRED, 'error')
          } else if (
            res.headers.get('Content-Type')?.includes('application/json')
          ) {
            const data = (await res.json()) as { error?: string }
            toast.show(data.error ?? CLIENT_MSG.DOWNLOAD_FAIL, 'error')
          } else {
            toast.show(CLIENT_MSG.DOWNLOAD_FAIL, 'error')
          }
          return
        }

        const blob = await res.blob()
        let blobUrl: string
        try {
          blobUrl = URL.createObjectURL(blob)
        } catch {
          toast.show(CLIENT_MSG.DOWNLOAD_OOM, 'error')
          return
        }
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = track.filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      } catch {
        toast.show(CLIENT_MSG.DOWNLOAD_NETWORK, 'error')
      } finally {
        setIsDownloading(false)
      }
    },
    [r2Key, toast]
  )

  // ---- Track selection (shared by desktop & mobile) ------------------------
  const openTrack = useCallback(
    (idx: number) => {
      setSelectedIdx(idx)
      audio.stop()
    },
    [audio]
  )

  const goBack = useCallback(() => {
    setSelectedIdx(null)
    audio.stop()
  }, [audio])

  // ========================================================================
  // RENDER — sub-panels
  // ========================================================================

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

      {/* Play / streaming status */}
      {audio.streamUrl ? (
        <p className="text-[10px] font-mono opacity-30 text-center py-2">
          {audio.isBuffering ? 'バッファリング中…' : 'ストリーミング再生中'}
        </p>
      ) : (
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => audio.play(selected)}
        >
          ▶ 再生
        </Button>
      )}
    </div>
  ) : null

  const detailPanel = selected ? (
    <div className="space-y-6">
      <TrackCredits track={selected} albumTitle={album.title} />

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => handleDownload(selected)}
        disabled={isDownloading}
      >
        {isDownloading ? 'ダウンロード中…' : 'ダウンロード'}
      </Button>

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
      <aside className="col-span-3">
        <TrackList
          album={album}
          tracks={tracks}
          selectedIdx={selectedIdx}
          onSelect={openTrack}
        />
      </aside>

      <div className="col-span-4">
        {playerPanel ?? (
          <Card noHover>
            <p className="text-sm opacity-50 font-mono text-center py-12">
              トラックを選択してください。
            </p>
          </Card>
        )}
      </div>

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
        <TrackList
          album={album}
          tracks={tracks}
          selectedIdx={selectedIdx}
          onSelect={openTrack}
        />
      ) : (
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

      {/* Single <audio> element — rendered once to prevent desktop/mobile
           layouts from each mounting their own instance. */}
      {audio.streamUrl && selected && (
        <audio
          ref={audio.audioRef}
          src={audio.streamUrl}
          controls
          autoPlay
          onError={() => audio.handleError(selected)}
          onCanPlay={audio.handleCanPlay}
          onWaiting={audio.handleWaiting}
          onStalled={audio.handleStalled}
          onPlaying={audio.clearStallTimer}
          onTimeUpdate={audio.handleTimeUpdate}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(90vw,480px)] z-50 shadow-lg"
        />
      )}
    </div>
  )
}
