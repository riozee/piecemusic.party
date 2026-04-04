import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { absoluteUrl, siteConfig } from '@/lib/site-config'
import type { AlbumInfo } from '@/components/portal/types'

// ---------------------------------------------------------------------------
// SEO Metadata
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hardcoded album catalogue
// ---------------------------------------------------------------------------

const albums: AlbumInfo[] = [
  {
    id: 'chokaigi-collection',
    title: 'ニコ超 2026年 コレクション',
    description: '逆転 ほか、各種シングル楽曲をまとめたダウンロードパック。',
    cover: '/images/gyakutenn.png',
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DownloadPage() {
  return (
    <div className="container mx-auto max-w-5xl p-3 pt-12 mb-24">
      {/* Back */}
      <div className="mb-8">
        <Link href="/">
          <Button variant="outline" className="text-sm">
            &lt; ホームへ戻る
          </Button>
        </Link>
      </div>

      {/* Heading */}
      <div className="mb-8 border-b-4 border-primary-orange inline-block relative">
        <h1 className="text-4xl font-bold font-mono" data-text="ダウンロード">
          ダウンロード
        </h1>
      </div>

      <p className="font-mono text-sm opacity-60 mb-8">
        アクセスカードをお持ちの方は、アルバムを選択してパスコードを入力してください。
      </p>

      {/* Album grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/download/${album.id}`}
            className="block group no-underline"
          >
            <Card className="cursor-target h-full p-0! overflow-hidden">
              {/* Cover */}
              <div className="relative aspect-square w-full overflow-hidden bg-foreground/5">
                <Image
                  src={album.cover}
                  alt={album.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              {/* Info */}
              <div className="p-5">
                <h2 className="text-lg font-bold font-mono group-hover:text-primary-blue transition-colors">
                  {album.title}
                </h2>
                <p className="text-xs opacity-60 mt-2 line-clamp-2">
                  {album.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
