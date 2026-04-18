/**
 * Album catalogue — single source of truth for download portal data.
 *
 * Both `/download` (index) and `/download/[album]` (detail) import from here.
 * Track `body` fields contain raw MDX source that is compiled at build time
 * by the album page's `resolveAlbumData()`.
 */

import type { AlbumData, AlbumInfo } from '@/components/portal/types'

// ---------------------------------------------------------------------------
// Full catalogue (album + tracks)
// ---------------------------------------------------------------------------

export const albumCatalogue: Record<string, AlbumData> = {
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
        filename: 'discord-sfx-calling-250633.mp3',
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
        filename: 'discord-sfx-calling-250633.mp3',
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

  'piecemusic-collection': {
    album: {
      id: 'piecemusic-collection',
      title: 'Piece Music コレクション',
      description: '逆転 ほか、各種シングル楽曲をまとめたダウンロードパック。',
      cover: '/images/gyakutenn.png',
    },
    tracks: [
      {
        title: '逆転',
        filename: 'discord-sfx-calling-250633.mp3',
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
        filename: 'discord-sfx-calling-250633.mp3',
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
// Derived: album list for the index page
// ---------------------------------------------------------------------------

/**
 * Optional per-album overrides for the index page.
 * Only specify fields that should differ from the catalogue.
 * (e.g. marketing copy, alternative cover, etc.)
 */
const indexOverrides: Record<string, Partial<AlbumInfo>> = {
  'piecemusic-collection': {
    title: 'ピースミュージックCollection',
    description: 'ピースミュージックCollectionのダウンロードパック。',
    cover: '/images/piecemusic-collection.png',
  },
}

/**
 * Album info for the `/download` index page.
 * Auto-derived from the catalogue with optional per-album overrides.
 */
export const albumIndex: AlbumInfo[] = Object.values(albumCatalogue).map(
  ({ album }) => ({
    ...album,
    ...indexOverrides[album.id],
  })
)

/** All known album slugs — used by `generateStaticParams`. */
export const albumSlugs = Object.keys(albumCatalogue)
