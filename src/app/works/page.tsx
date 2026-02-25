import { works } from '#site/content'
import { Metadata } from 'next'

import WorksGrid from '@/components/WorksGrid'
import Link from 'next/link'
import Button from '@/components/Button'
import { siteConfig, absoluteUrl } from '@/lib/site-config'

const title = '作品'
const description = 'Piece Musicの制作楽曲・作品一覧。'
const url = absoluteUrl('/works')
const ogImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  title,
  description,
  keywords: [...siteConfig.defaultKeywords, '楽曲', '作品', 'オリジナル曲'],
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

export default function WorksPage() {
  const sortedWorks = works
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((work) => ({
      ...work,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tags: (work as any).tags || [], // Safe fallback until content is rebuilt
      // ensure download property is available even if the generated
      // type hasn't been updated yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      download: (work as any).download || undefined,
    }))

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 pb-32 md:pb-8 relative">
      <div className="mt-4 mb-8">
        <Link href="/">
          <Button variant="outline" className="text-sm">
            &lt; ホームへ戻る
          </Button>
        </Link>
      </div>
      <div className="mb-8 border-b-4 border-primary-orange inline-block relative">
        <h1 className="text-4xl font-bold font-mono" data-text="作品">
          作品
        </h1>
      </div>
      <WorksGrid works={sortedWorks} />
    </div>
  )
}
