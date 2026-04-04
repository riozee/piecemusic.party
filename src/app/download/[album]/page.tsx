import { notFound } from 'next/navigation'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { AlbumPortal } from '@/components/portal'
import type { AlbumData } from '@/components/portal/types'

// ---------------------------------------------------------------------------
// NO SEO metadata — intentionally omitted for gated content pages.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Server-side MDX compilation
// The `body` strings in the catalogue are written as raw Markdown/MDX source.
// They must be compiled to a JS function-body string before being passed to
// <MDXContent> on the client (which does `new Function(code)`).
// ---------------------------------------------------------------------------

async function compileMdxBody(src: string): Promise<string> {
  const vfile = await compile(src, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
  })
  return String(vfile)
}

async function resolveAlbumData(data: AlbumData): Promise<AlbumData> {
  const tracks = await Promise.all(
    data.tracks.map(async (track) => ({
      ...track,
      body: track.body ? await compileMdxBody(track.body) : undefined,
    }))
  )
  return { ...data, tracks }
}

// ---------------------------------------------------------------------------
// Hardcoded album catalogue with tracklists
// Track schema mirrors the `works` MDX frontmatter — each track may carry
// its own cover, credits, tags, links, and an optional compiled MDX body.
// ---------------------------------------------------------------------------

const albumCatalogue: Record<string, AlbumData> = {
  'chokaigi-collection': {
    album: {
      id: 'chokaigi-collection',
      title: 'ニコ超 2026年 コレクション',
      description: '逆転 ほか、各種シングル楽曲をまとめたダウンロードパック。',
      cover: '/images/gyakutenn.png',
    },
    tracks: [
      {
        title: '逆転',
        filename: 'chokaigi-collection/discord-sfx-calling-250633.mp3',
        duration: '3:35',
        cover: '/images/gyakutenn.png',
        description: 'ボカコレ2026冬ex参加曲。',
        date: '2026-02-19',
        author: 'Piece Music',
        vocal: '知声 (Chis-A)',
        lyric: 'yu_IT',
        music: 'Nina December',
        illust: 'どらごん',
        movie: 'どらごん',
        tags: ['ボカコレ'],
        links: [
          {
            label: 'Niconico',
            url: 'https://www.nicovideo.jp/watch/sm45965390',
          },
        ],
        body: `## About

- Produced by ピースミュージック
- Music : [Nina December](https://x.com/december_nina)
- Illustration & MV: [どらごん](https://x.com/rutzchy)

ボカコレ2026冬ex参加曲です。
『The VOCALOID Collection （ボカコレ）』はボカロ文化をきっかけに生まれたインターネット等で活動するクリエイターやユーザー、企業などボカロに関わる全ての方が参加できるボカロ文化の祭典です。

▼ボカコレ2026冬ex
https://vocaloid-collection.jp/exhibition/`,
      },
      {
        title: '逆転 (Instrumental)',
        filename: 'chokaigi-collection/discord-sfx-calling-250633.mp3',
        duration: '3:35',
        cover: '/images/gyakutenn.png',
        description: '逆転のインストゥルメンタルバージョン。',
        date: '2026-02-19',
        author: 'Piece Music',
        music: 'Nina December',
        body: `## About

- Produced by ピースミュージック
- Music : [Nina December](https://x.com/december_nina)
- Illustration & MV: [どらごん](https://x.com/rutzchy)

ボカコレ2026冬ex参加曲です。
『The VOCALOID Collection （ボカコレ）』はボカロ文化をきっかけに生まれたインターネット等で活動するクリエイターやユーザー、企業などボカロに関わる全ての方が参加できるボカロ文化の祭典です。

▼ボカコレ2026冬ex
https://vocaloid-collection.jp/exhibition/`,
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

  const resolved = await resolveAlbumData(data)
  return <AlbumPortal data={resolved} />
}
