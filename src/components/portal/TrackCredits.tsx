'use client'

import Button from '@/components/Button'
import type { Track } from './types'

/**
 * Sidebar metadata block showing credits for a single track.
 * Mirrors the layout used on `/works/[slug]` pages.
 */
export default function TrackCredits({
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
