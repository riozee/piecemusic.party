import type { Metadata } from 'next'
import { works } from '#site/content'
import Link from 'next/link'
import Button from '@/components/Button'
import DownloadList, { type DownloadGroup } from '@/components/DownloadList'
import { absoluteUrl, siteConfig } from '@/lib/site-config'

const title = 'ダウンロード'
const description = 'Piece Music作品のアクセスカード対応ダウンロードページ。'
const url = absoluteUrl('/download')
const ogImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  title,
  description,
  keywords: [...siteConfig.defaultKeywords, 'ダウンロード', 'アクセスカード'],
  alternates: { canonical: url },
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

// Build title string from an array: ["A"] → "A", ["A","B"] → "A & B",
// ["A","B","C"] → "A, B & C"
function joinTitles(titles: string[]): string {
  if (titles.length === 1) return titles[0]
  if (titles.length === 2) return `${titles[0]} & ${titles[1]}`
  return `${titles.slice(0, -1).join(', ')} & ${titles[titles.length - 1]}`
}

function getDownloadSlug(url: string): string {
  try {
    // Strip leading slashes from pathname to get a clean id
    return new URL(url).pathname.replace(/^\/+/, '')
  } catch {
    // Fallback for malformed URLs
    return url.split('/').pop() ?? url
  }
}

function buildGroups(): DownloadGroup[] {
  const worksWithDownload = works.filter((w) => w.download)

  // Group works by their download URL
  const groupMap = new Map<string, typeof worksWithDownload>()
  for (const work of worksWithDownload) {
    const dlUrl = work.download!
    if (!groupMap.has(dlUrl)) groupMap.set(dlUrl, [])
    groupMap.get(dlUrl)!.push(work)
  }

  return Array.from(groupMap.entries()).map(([dlUrl, ws]) => {
    const covers = ws.map((w) => w.cover).filter(Boolean) as string[]
    const dates = ws.map((w) => w.date).sort()
    const latestDate = dates[dates.length - 1]

    return {
      id: getDownloadSlug(dlUrl),
      downloadUrl: dlUrl,
      title: joinTitles(ws.map((w) => w.title)),
      covers,
      latestDate,
    }
  })
}

export default function DownloadPage() {
  const groups = buildGroups()

  return (
    <div className="container mx-auto max-w-5xl p-3 pt-12 mb-24">
      <div className="mb-8">
        <Link href="/">
          <Button variant="outline" className="text-sm">
            &lt; ホームへ戻る
          </Button>
        </Link>
      </div>

      <div className="mb-8 border-b-4 border-primary-orange inline-block relative">
        <h1 className="text-4xl font-bold font-mono" data-text="ダウンロード">
          ダウンロード
        </h1>
      </div>

      <p className="font-mono text-sm opacity-60 mb-8">
        アクセスカードをお持ちの方は、各アイテムをクリックすると利用方法をご確認いただけます。
      </p>

      <DownloadList groups={groups} />
    </div>
  )
}
