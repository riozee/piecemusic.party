import { events } from '#site/content'
import { Metadata } from 'next'
import EventsPageContent from '@/components/EventsPageContent'
import { siteConfig, absoluteUrl } from '@/lib/site-config'

const title = 'イベント'
const description = '今後のイベントと過去のイベント。'
const url = absoluteUrl('/events')
const ogImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  title,
  description,
  keywords: [...siteConfig.defaultKeywords, 'イベント', 'コンサート', 'ライブ'],
  alternates: {
    canonical: url,
  },
  openGraph: {
    type: 'website',
    title: `${title} | ${siteConfig.name}`,
    description,
    url,
    siteName: siteConfig.name,
    locale: siteConfig.locale.replace('-', '_'),
    images: [{ url: ogImage, alt: title }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} | ${siteConfig.name}`,
    description,
    creator: '@Piece_Music_',
    site: '@piecemusic.party',
    images: [ogImage],
  },
}

export default function EventsPage() {
  return <EventsPageContent events={events} />
}
