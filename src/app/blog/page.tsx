import { posts } from '#site/content'
import Link from 'next/link'
import { Metadata } from 'next'
import Button from '@/components/Button'
import PostsGrid from '@/components/PostsGrid'
import { siteConfig, absoluteUrl } from '@/lib/site-config'

const title = 'ブログ'
const description = 'Piece Musicの記事、研究、更新情報。'
const url = absoluteUrl('/blog')
const ogImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  title,
  description,
  keywords: [...siteConfig.defaultKeywords, 'ブログ', '記事', '更新情報'],
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

export default function BlogPage() {
  // ensure tags field exists even if some posts haven't been rebuilt yet
  const postsWithTags = posts.map((post) => ({
    ...post,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: (post as any).tags || [],
  }))

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
        <h1 className="text-4xl font-bold font-mono" data-text="ブログ">
          ブログ
        </h1>
      </div>

      {/* sr-only h2 bridges the h1→h3 gap from PostCard headings */}
      <h2 className="sr-only">投稿一覧</h2>
      <PostsGrid posts={postsWithTags} />
    </div>
  )
}
