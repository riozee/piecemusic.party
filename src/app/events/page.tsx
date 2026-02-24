import { events } from '#site/content'
// Link was previously used by EventRow but is no longer needed
import { Metadata } from 'next'
import ScheduleCard from '@/components/ScheduleCard'
import Link from 'next/link'
import Button from '@/components/Button'
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
  const isUpcoming = (evtDate: string) => {
    try {
      return new Date(evtDate).getTime() >= new Date().getTime()
    } catch {
      return false
    }
  }

  const upcomingEvents = events
    .filter((e) => isUpcoming(e.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const pastEvents = events
    .filter((e) => !isUpcoming(e.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-20 relative">
      <div className="mt-4 mb-8">
        <Link href="/">
          <Button variant="outline" className="text-sm">
            &lt; ホームへ戻る
          </Button>
        </Link>
      </div>
      <section className="relative">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-4 h-4 bg-primary-orange animate-pulse" />
          <h1 className="text-4xl font-bold font-mono tracking-tighter">
            開催予定のイベント
          </h1>
        </div>

        <div className="grid gap-12 relative">
          {upcomingEvents.length > 0 ? (
            <ScheduleCard events={upcomingEvents} />
          ) : (
            <div className="border border-dashed border-foreground/30 p-8 text-center font-mono opacity-50 ml-8">
              イベントはありません
            </div>
          )}
        </div>
      </section>

      <section className="relative">
        <div className="flex items-center gap-4 mb-12 opacity-50">
          <div className="w-4 h-4 bg-foreground" />
          <h2 className="text-3xl font-bold font-mono tracking-tighter">
            過去のイベント
          </h2>
        </div>

        <div className="grid gap-12 relative transition-opacity duration-500">
          {pastEvents.length > 0 ? (
            <ScheduleCard events={pastEvents} />
          ) : (
            <div className="border border-dashed border-foreground/30 p-8 text-center font-mono opacity-50 ml-8">
              過去のイベントはありません
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
