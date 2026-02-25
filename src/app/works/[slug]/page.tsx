import type { Metadata } from 'next'
import { works } from '#site/content'
import { notFound } from 'next/navigation'
import { MDXContent } from '@/components/mdx-content'
import Image from 'next/image'
import Button from '@/components/Button'
import AccessCardDownloadButton from '@/components/AccessCardDownloadButton'
import { absoluteUrl, siteConfig } from '@/lib/site-config'
import { ClickableImageTrigger } from '@/components/ClickableImage'

interface WorkPageProps {
  params: Promise<{
    slug: string
  }>
}

type Work = (typeof works)[number]

const defaultWorkImage = absoluteUrl(siteConfig.defaultOgImage)

const toIsoDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

async function getWorkFromParams(params: WorkPageProps['params']) {
  const slug = (await params).slug
  const work = works.find((work) => work.slug === slug)
  if (!work) return null
  return work
}

export const dynamicParams = false

export async function generateStaticParams() {
  return works.map((work) => ({
    slug: work.slug,
  }))
}

const buildWorkMetadata = (work: Work): Metadata => {
  const canonicalUrl = absoluteUrl(work.permalink)
  const coverImageUrl = work.cover ? absoluteUrl(work.cover) : defaultWorkImage
  const description = work.description ?? `${work.title} | ${siteConfig.name}`
  const releasedTime = toIsoDate(work.date)
  const keywords = Array.from(
    new Set([
      ...siteConfig.defaultKeywords,
      work.title,
      work.author,
      ...(work.tags ?? []),
    ])
  ).filter(Boolean) as string[]

  return {
    title: work.title,
    description,
    category: 'Music',
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: work.author }],
    publisher: siteConfig.name,
    openGraph: {
      type: 'article',
      title: work.title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      publishedTime: releasedTime,
      locale: siteConfig.locale.replace('-', '_'),
      authors: [work.author],
      images: [
        {
          url: coverImageUrl,
          alt: work.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: work.title,
      description,
      creator: '@Piece_Music_',
      site: '@piecemusic.party',
      images: [coverImageUrl],
    },
  }
}

export async function generateMetadata(
  props: WorkPageProps
): Promise<Metadata> {
  const work = await getWorkFromParams(props.params)

  if (!work) {
    return {
      title: '作品が見つかりません',
      description: `${siteConfig.name} の作品が見つかりませんでした。`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return buildWorkMetadata(work)
}

export default async function WorkPage(props: WorkPageProps) {
  const work = await getWorkFromParams(props.params)

  if (!work) {
    notFound()
  }

  const canonicalUrl = absoluteUrl(work.permalink)
  const coverImageUrl = work.cover ? absoluteUrl(work.cover) : defaultWorkImage

  // Extract raw cover src (may be a string or a Velite image object with .src)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawWorkCover: any = work.cover
  const workCoverSrc: string | undefined =
    typeof rawWorkCover === 'string'
      ? rawWorkCover
      : rawWorkCover && typeof rawWorkCover.src === 'string'
        ? rawWorkCover.src
        : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: work.title,
    description: work.description ?? `${work.title} | ${siteConfig.name}`,
    image: [coverImageUrl],
    datePublished: toIsoDate(work.date),
    url: canonicalUrl,
    byArtist: { '@type': 'MusicGroup', name: work.author },
    ...(work.vocal
      ? { performer: { '@type': 'Person', name: work.vocal } }
      : {}),
    ...(work.music
      ? { composer: { '@type': 'Person', name: work.music } }
      : {}),
    ...(work.lyric
      ? { lyricist: { '@type': 'Person', name: work.lyric } }
      : {}),
    inAlbum: {
      '@type': 'MusicAlbum',
      byArtist: { '@type': 'MusicGroup', name: work.author },
    },
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
    <div className="min-h-screen relative overflow-hidden text-foreground">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <div className="absolute inset-0 bg-background/50" />
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10 py-12 pb-32 md:pb-12">
        {/* Navigation */}
        <div className="mb-8">
          <Button href="/works" variant="outline" className="group">
            <span className="group-hover:-translate-x-1 transition-transform inline-block">
              &lt;
            </span>{' '}
            他の作品を見る
          </Button>
        </div>

        <div className="grid md:grid-cols-12 gap-12 lg:gap-16">
          {/* Sidebar / Jacket Area */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6 relative">
            <ClickableImageTrigger
              src={workCoverSrc}
              alt={work.title}
              className="relative aspect-video border-2 border-foreground bg-black shadow-[8px_8px_0px_var(--primary-blue)] group overflow-hidden transition-all hover:shadow-[12px_12px_0px_var(--primary-orange)] hover:-translate-x-0.5 hover:-translate-y-0.5 z-10"
            >
              {workCoverSrc ? (
                <Image
                  src={workCoverSrc}
                  alt={work.title}
                  fill
                  className="object-cover animate-puzzle-assemble"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-900 text-white font-mono text-xl">
                  ¯\_(ツ)_/¯
                </div>
              )}
            </ClickableImageTrigger>
            {/* puzzle piece svg positioned just under the cover art */}
            <div
              className="absolute left-1/2 translate-x-16 md:translate-x-24 md:translate-y-6 pointer-events-none z-0 scale-[2] rotate-24"
              style={{ top: 'calc(100% * (9/16))' }}
            >
              <svg
                width="87"
                height="89"
                viewBox="0 0 87 89"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24 text-primary-orange/20 fill-current"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M51.0945 13.8028C49.3765 9.04383 57.4845 6.66384 53.5085 2.38584C49.4295 0.693843 44.9485 -0.194163 40.5275 0.0358367C37.6515 0.184837 32.7305 0.641834 31.4465 3.63883C30.0455 6.90583 35.7385 9.75083 34.4895 13.8068C23.4045 18.2058 12.2795 15.1088 1.0955 12.8598C1.5945 16.2538 1.87748 19.6308 0.803477 23.6388C-0.661523 29.1028 -0.898523 36.1399 6.98448 36.0039C13.4525 35.8929 23.3975 28.7679 23.1025 41.0469C23.0195 44.5049 22.0375 49.6778 17.9025 50.2438C14.8105 50.6678 12.2325 48.5408 9.4835 47.5528C1.0875 44.5358 -0.380504 57.4199 0.297496 62.9479C0.678496 66.0549 1.13649 68.7658 1.45549 71.3638C14.1575 71.6268 26.6585 72.7988 29.7265 73.3778C32.0055 73.8078 34.7375 73.2748 34.7195 76.1608C34.7065 78.2508 33.3165 79.8758 32.1865 81.5028C29.4405 85.4568 33.1795 87.2609 36.8495 88.1029C40.8465 89.0209 45.1105 88.9188 49.0245 87.6658C54.5685 85.8918 55.7395 84.2818 52.1945 79.9628C45.6315 71.9658 67.8335 72.0088 72.0745 71.6828C76.2665 71.3598 80.4765 71.1858 84.6865 71.1788C85.3395 65.9128 86.7145 60.6958 86.0215 55.2688C85.3615 50.1048 83.5845 46.5618 77.9975 47.3158C75.8515 49.5338 72.7825 50.8308 69.7985 49.5158C66.7045 48.1518 64.8175 44.7499 64.5585 41.4779C64.1845 36.7329 66.6615 36.4358 69.0865 33.4078C72.8075 32.1758 77.3225 35.5828 81.2635 35.7818C85.0185 35.9718 85.9375 31.6198 86.2195 28.2998C86.6475 23.2678 85.0265 18.3759 83.3065 13.5429C72.5245 15.7359 61.8035 18.1778 51.0945 13.8028Z"
                />
              </svg>
            </div>

            {/* Metadata Console */}
            <div className="font-mono text-sm space-y-4 border-l-2 border-foreground/50 pl-4 py-2 relative z-10 mt-8">
              <div className="flex justify-between border-b border-foreground/20 pb-1">
                <span className="opacity-50">リリース日</span>
                <span>{work.date}</span>
              </div>
              <div className="flex justify-between border-b border-foreground/20 pb-1">
                <span className="opacity-50">アーティスト</span>
                <span>{work.author}</span>
              </div>

              {/* Credits */}
              {work.vocal && (
                <div className="flex justify-between border-b border-foreground/20 pb-1">
                  <span className="opacity-50">ボーカル</span>
                  <span>{work.vocal}</span>
                </div>
              )}
              {work.music && (
                <div className="flex justify-between border-b border-foreground/20 pb-1">
                  <span className="opacity-50">音楽</span>
                  <span>{work.music}</span>
                </div>
              )}
              {work.lyric && (
                <div className="flex justify-between border-b border-foreground/20 pb-1">
                  <span className="opacity-50">作詞</span>
                  <span>{work.lyric}</span>
                </div>
              )}
              {work.illust && (
                <div className="flex justify-between border-b border-foreground/20 pb-1">
                  <span className="opacity-50">イラスト</span>
                  <span>{work.illust}</span>
                </div>
              )}
              {work.movie && (
                <div className="flex justify-between border-b border-foreground/20 pb-1">
                  <span className="opacity-50">動画</span>
                  <span>{work.movie}</span>
                </div>
              )}

              {/* TAGS */}
              <div className="flex justify-between border-b border-foreground/20 pb-1">
                <span className="opacity-50">タグ</span>
                <span>
                  {work.tags && work.tags.length > 0
                    ? work.tags.map((v) => '#' + v).join(' ')
                    : '（タグなし）'}
                </span>
              </div>

              {/* Links loop */}
              <div className="flex flex-col gap-2 mt-4">
                {work.download &&
                  (work.accessCard ? (
                    <AccessCardDownloadButton downloadUrl={work.download} />
                  ) : (
                    <Button href={work.download} variant="warning">
                      <span className="relative z-10">ダウンロード &gt;</span>
                    </Button>
                  ))}

                {work.links?.map((link) => (
                  <Button key={link.url} href={link.url} variant="outline">
                    <span className="relative z-10">{link.label} &gt;</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col">
            <div className="mb-12">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-mono tracking-tighter mb-4 wrap-break-word leading-[0.9]">
                <span className="glitch-text" data-text={work.title}>
                  {work.title}
                </span>
              </h1>
              <div className="h-1 w-24 bg-primary-blue mt-4" />
            </div>

            <div className="prose dark:prose-invert max-w-none relative grow">
              {/* MDX Content wrapper */}
              <div className="bg-card-bg/50 p-6 md:p-8 border border-foreground/10 backdrop-blur-sm shadow-sm relative">
                <MDXContent code={work.body} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
