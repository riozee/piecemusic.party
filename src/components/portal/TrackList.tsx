'use client'

import Image from 'next/image'
import Card from '@/components/Card'
import type { AlbumInfo, Track } from './types'

/** Resolve cover for a track (fallback to album cover). */
function trackCover(track: Track, fallback: string): string {
  return track.cover ?? fallback
}

interface TrackListProps {
  album: AlbumInfo
  tracks: Track[]
  selectedIdx: number | null
  onSelect: (idx: number) => void
}

/**
 * Scrollable tracklist card.
 * Used as a desktop sidebar and as the mobile "screen 1" list.
 */
export default function TrackList({
  album,
  tracks,
  selectedIdx,
  onSelect,
}: TrackListProps) {
  return (
    <Card noHover className="p-0!">
      {/* Album header */}
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

      {/* Track items */}
      <ul className="divide-y divide-foreground/10 max-h-[70vh] overflow-y-auto">
        {tracks.map((track, idx) => (
          <li key={track.title}>
            <button
              onClick={() => onSelect(idx)}
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
}
