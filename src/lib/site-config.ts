const LIVE_URL = 'https://piecemusic.party' // Placeholder URL

export const siteConfig = {
  name: 'Piece Music',
  description: 'Piece Music | ボカロサークル',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? LIVE_URL,
  locale: 'ja-JP',
  socials: {
    twitter: 'https://x.com/Piece_Music_',
    youtube: 'https://www.youtube.com/@piece_music_pm',
    niconico: 'https://www.nicovideo.jp/user/138839918',
  },
  defaultOgImage: '/piecemusic-cover.jpeg',
  defaultKeywords: [
    'Piece Music',
    'ピースミュージック',
    'Vocaloid',
    'ボーカロイド',
    'DTM',
    '大学サークル',
    '作曲',
    'Music Production',
    'サークル',
    '大学生',
  ],
}

export const absoluteUrl = (path: string) => {
  try {
    return new URL(path, siteConfig.url).toString()
  } catch {
    // Ensure we always fall back to a usable URL even if env misconfigured.
    return new URL(path, LIVE_URL).toString()
  }
}
