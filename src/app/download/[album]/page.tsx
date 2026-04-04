import { notFound } from 'next/navigation'
import { AlbumPortal } from '@/components/portal'
import type { AlbumData } from '@/components/portal/types'

// ---------------------------------------------------------------------------
// NO SEO metadata — intentionally omitted for gated content pages.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hardcoded album catalogue with tracklists
// ---------------------------------------------------------------------------

const albumCatalogue: Record<string, AlbumData> = {
  'chokaigi-collection': {
    album: {
      id: 'chokaigi-collection',
      title: 'ニコ超 2026年 コレクション',
      description: '逆転 ほか、各種シングル楽曲をまとめたダウンロードパック。',
      cover: '/images/gyakutenn.png',
    },
    // placeholders
    tracks: [
      {
        title: '逆転',
        filename: 'chokaigi-collection/discord-sfx-calling-250633.mp3',
        description:
          'ボカコレ2026冬ex参加曲。Vocal: 知声 (Chis-A) / Lyric: yu_IT / Music: Nina December / Illustration & MV: どらごん',
        duration: '3:35',
      },
      {
        title: '逆転 (Instrumental)',
        filename: 'chokaigi-collection/discord-sfx-calling-250633.mp3',
        description: '逆転のインストゥルメンタルバージョン。',
        duration: '3:35',
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Generate static params for static export
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return Object.keys(albumCatalogue).map((album) => ({ album }))
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ album: string }>
}

export default async function AlbumPage({ params }: PageProps) {
  const { album } = await params
  const data = albumCatalogue[album]

  if (!data) {
    notFound()
  }

  return <AlbumPortal data={data} />
}
