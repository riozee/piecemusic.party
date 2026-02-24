import type { Metadata } from 'next'
import { posts } from '#site/content'
import { notFound } from 'next/navigation'
import { MDXContent } from '@/components/mdx-content'
import ShareButton from '@/components/ShareButton'
import { absoluteUrl, siteConfig } from '@/lib/site-config'
import Button from '@/components/Button'

interface PostPageProps {
  params: Promise<{
    slug: string
  }>
}

type Post = (typeof posts)[number]

const defaultArticleImage = absoluteUrl(siteConfig.defaultOgImage)

const toIsoDate = (value?: string) => {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

async function getPostFromParams(params: PostPageProps['params']) {
  const slug = (await params).slug
  const post = posts.find((post) => post.slug === slug)

  if (!post) {
    return null
  }

  return post
}

export const dynamicParams = false

export async function generateStaticParams() {
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

const buildArticleMetadata = (post: Post): Metadata => {
  const canonicalUrl = absoluteUrl(post.permalink)
  // cover may be a string (remote URL or local path) or an object with a src property
  const rawCover = post.cover as unknown
  // helper type for potential image object produced by Velite
  type CoverObject = { src?: string; width?: number; height?: number }
  const coverSrc =
    typeof rawCover === 'string'
      ? rawCover
      : rawCover && typeof (rawCover as CoverObject).src === 'string'
        ? (rawCover as CoverObject).src
        : undefined
  const coverImageUrl = coverSrc ? absoluteUrl(coverSrc) : defaultArticleImage
  const description = post.description ?? `${post.title} | ${siteConfig.name}`
  const publishedTime = toIsoDate(post.date)
  const keywords = Array.from(
    new Set([
      ...siteConfig.defaultKeywords,
      post.title,
      post.author ?? '',
      ...(post.tags ?? []),
    ])
  ).filter(Boolean) as string[]

  return {
    title: post.title,
    description,
    category: 'Music',
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: post.author
      ? [{ name: post.author }]
      : [{ name: siteConfig.name }],
    publisher: siteConfig.name,
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      publishedTime,
      modifiedTime: publishedTime,
      locale: siteConfig.locale.replace('-', '_'),
      section: 'Music',
      authors: post.author ? [post.author] : undefined,
      images: [
        {
          url: coverImageUrl,
          width:
            typeof rawCover === 'object' &&
            rawCover &&
            (rawCover as CoverObject).width
              ? (rawCover as CoverObject).width
              : undefined,
          height:
            typeof rawCover === 'object' &&
            rawCover &&
            (rawCover as CoverObject).height
              ? (rawCover as CoverObject).height
              : undefined,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      creator: post.author ?? '@Piece_Music_',
      site: '@piecemusic.party',
      images: [coverImageUrl],
    },
  }
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await getPostFromParams(params)

  if (!post) {
    return {
      title: '記事が見つかりません',
      description: `${siteConfig.name} の記事が見つかりませんでした。`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return buildArticleMetadata(post)
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPostFromParams(params)

  if (!post) {
    notFound()
  }

  const canonicalUrl = absoluteUrl(post.permalink)
  // calculate coverImageUrl here as well for json‑ld
  const rawCover2 = post.cover as unknown
  type CoverObject = { src?: string }
  const coverSrc2 =
    typeof rawCover2 === 'string'
      ? rawCover2
      : rawCover2 && typeof (rawCover2 as CoverObject).src === 'string'
        ? (rawCover2 as CoverObject).src
        : undefined
  const coverImageUrl2 = coverSrc2
    ? absoluteUrl(coverSrc2)
    : defaultArticleImage

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description ?? `${post.title} | ${siteConfig.name}`,
    image: [coverImageUrl2],
    datePublished: toIsoDate(post.date),
    dateModified: toIsoDate(post.date),
    mainEntityOfPage: canonicalUrl,
    author: post.author
      ? [{ '@type': 'Person', name: post.author }]
      : [{ '@type': 'Organization', name: siteConfig.name }],
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/piecemusic_logo.png'),
      },
    },
  }

  return (
    <div className="flex flex-col items-center py-12 md:py-16">
      <div className="w-[90%] max-w-5xl mb-8 self-auto">
        <Button href="/blog" variant="outline" className="group">
          <span className="group-hover:-translate-x-1 transition-transform inline-block">
            &lt;
          </span>{' '}
          他の投稿を見る
        </Button>
      </div>

      <article className="relative isolate min-h-screen py-8 md:py-16 px-8 w-full md:w-[95%] bg-background rounded-lg overflow-hidden">
        <div className="max-w-5xl mx-auto">
          {/* decorative puzzle pieces — rendered first so they sit behind all content */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
            {/* top right orange piece */}
            <svg
              className="absolute top-12 right-12 scale-[2] md:top-48 md:right-48 md:scale-[4] w-32 h-32 fill-current text-primary-orange/20 rotate-45"
              viewBox="0 0 119 89"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M96.0115 61.7759C94.7405 55.0919 97.6465 44.1149 106.339 48.1219C109.35 49.5109 113.559 52.0619 116.09 48.6019C118.061 45.9079 119.084 42.3569 118.46 39.0389C116.363 27.9069 106.872 37.2689 100.446 35.9019C91.7915 29.5359 97.1255 23.0819 97.9765 14.2489C97.9915 14.0979 97.9975 13.9459 98.0085 13.7949C96.5165 14.1069 95.0285 14.4149 93.5425 14.7009C84.5715 16.4299 75.2175 17.3519 66.5425 13.8079C64.9025 9.26593 71.0405 7.89294 70.0075 3.33894C66.9445 0.822937 62.1125 0.148951 58.2135 0.0219515C54.8985 -0.0860485 48.4255 0.0719302 46.8945 3.64393C45.4935 6.91093 51.1865 9.75593 49.9375 13.8119C41.8715 16.9839 33.2305 16.207 24.9135 14.6C22.7565 14.183 20.5925 13.7139 18.4215 13.2569C19.6755 16.6889 20.9345 20.1169 21.4815 23.7409C21.9445 26.8039 21.7665 29.9409 20.5795 32.8289C18.7415 37.2959 13.9895 36.1179 10.0155 34.4049C1.67852 30.8109 -2.93849 40.3659 2.07951 46.9479C7.71351 54.3369 15.7895 42.7689 19.5235 49.3289C23.4475 56.2249 20.8535 63.7999 19.8795 71.1829C25.0535 71.1679 30.2275 71.4079 35.3715 71.9509C40.2755 72.4689 45.1525 73.262 49.9535 74.393C51.0355 78.578 44.2805 82.8299 47.4665 85.8319C52.9865 91.0339 64.4035 88.9629 70.0065 84.8859C70.8315 81.3269 66.5375 80.4269 66.2675 77.0749C65.9315 72.9199 74.8925 72.4599 77.7945 71.8729C82.0025 71.0209 86.3725 70.4619 90.6565 71.0559C93.6955 71.4779 95.7185 72.566 98.0265 73.035C98.0725 69.224 96.7165 65.4769 96.0115 61.7759Z"
              />
            </svg>

            {/* bottom left blue piece */}
            <svg
              className="absolute bottom-12 left-12 scale-[2] md:bottom-48 md:left-48 md:scale-[4] w-32 h-32 fill-current text-primary-blue/20 -rotate-45"
              viewBox="0 0 119 89"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M96.0115 61.7759C94.7405 55.0919 97.6465 44.1149 106.339 48.1219C109.35 49.5109 113.559 52.0619 116.09 48.6019C118.061 45.9079 119.084 42.3569 118.46 39.0389C116.363 27.9069 106.872 37.2689 100.446 35.9019C91.7915 29.5359 97.1255 23.0819 97.9765 14.2489C97.9915 14.0979 97.9975 13.9459 98.0085 13.7949C96.5165 14.1069 95.0285 14.4149 93.5425 14.7009C84.5715 16.4299 75.2175 17.3519 66.5425 13.8079C64.9025 9.26593 71.0405 7.89294 70.0075 3.33894C66.9445 0.822937 62.1125 0.148951 58.2135 0.0219515C54.8985 -0.0860485 48.4255 0.0719302 46.8945 3.64393C45.4935 6.91093 51.1865 9.75593 49.9375 13.8119C41.8715 16.9839 33.2305 16.207 24.9135 14.6C22.7565 14.183 20.5925 13.7139 18.4215 13.2569C19.6755 16.6889 20.9345 20.1169 21.4815 23.7409C21.9445 26.8039 21.7665 29.9409 20.5795 32.8289C18.7415 37.2959 13.9895 36.1179 10.0155 34.4049C1.67852 30.8109 -2.93849 40.3659 2.07951 46.9479C7.71351 54.3369 15.7895 42.7689 19.5235 49.3289C23.4475 56.2249 20.8535 63.7999 19.8795 71.1829C25.0535 71.1679 30.2275 71.4079 35.3715 71.9509C40.2755 72.4689 45.1525 73.262 49.9535 74.393C51.0355 78.578 44.2805 82.8299 47.4665 85.8319C52.9865 91.0339 64.4035 88.9629 70.0065 84.8859C70.8315 81.3269 66.5375 80.4269 66.2675 77.0749C65.9315 72.9199 74.8925 72.4599 77.7945 71.8729C82.0025 71.0209 86.3725 70.4619 90.6565 71.0559C93.6955 71.4779 95.7185 72.566 98.0265 73.035C98.0725 69.224 96.7165 65.4769 96.0115 61.7759Z"
              />
            </svg>
          </div>

          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <header className="mb-12">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
              {post.title}
            </h1>
            {/* tags are now shown directly under the title */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-primary-blue bg-primary-blue/10 px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* author/date info remains beneath tags/title */}
            {(post.author || post.date) && (
              <p className="text-sm text-gray-600">
                {post.author && <>投稿者 {post.author}</>}
                {post.author && post.date && ' | '}
                {post.date}
              </p>
            )}
          </header>

          {/* cover image display */}
          {coverSrc2 && (
            <div className="mb-12 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverSrc2}
                alt={post.title}
                className="w-full h-auto rounded-lg md:max-w-[60%]!"
              />
            </div>
          )}

          <div className="prose dark:prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-tight prose-a:text-primary-blue hover:prose-a:text-primary-orange prose-a:no-underline prose-a:border-b-2 prose-a:border-primary-blue/30 hover:prose-a:border-primary-orange transition-colors">
            <MDXContent code={post.body} />
          </div>
        </div>
      </article>
      <div className="w-[90%] max-w-5xl mt-8 mb-16 self-start md:self-auto md:w-[90%] flex justify-end">
        <ShareButton title={post.title} />
      </div>
    </div>
  )
}
