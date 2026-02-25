import type { Metadata } from 'next'
import { events } from '#site/content'
import { notFound } from 'next/navigation'
import { MDXContent } from '@/components/mdx-content'
import Button from '@/components/Button'
import StatusBadge from '@/components/StatusBadge'
import { absoluteUrl, siteConfig } from '@/lib/site-config'

interface EventPageProps {
  params: Promise<{
    slug: string
  }>
}

type Event = (typeof events)[number]

const defaultEventImage = absoluteUrl(siteConfig.defaultOgImage)

const toIsoDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

async function getEventFromParams(params: EventPageProps['params']) {
  const slug = (await params).slug
  const event = events.find((event) => event.slug === slug)
  if (!event) return null
  return event
}

export const dynamicParams = false

export async function generateStaticParams() {
  return events.map((event) => ({
    slug: event.slug,
  }))
}

const buildEventMetadata = (event: Event): Metadata => {
  const canonicalUrl = absoluteUrl(event.permalink)
  const coverImageUrl = event.cover
    ? absoluteUrl(event.cover)
    : defaultEventImage
  const description = event.description ?? `${event.title} | ${siteConfig.name}`
  const keywords = Array.from(
    new Set([
      ...siteConfig.defaultKeywords,
      event.title,
      'イベント',
      'コンサート',
    ])
  ).filter(Boolean) as string[]

  return {
    title: event.title,
    description,
    category: 'Music Event',
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [{ name: siteConfig.name }],
    publisher: siteConfig.name,
    openGraph: {
      type: 'website',
      title: event.title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale.replace('-', '_'),
      images: [
        {
          url: coverImageUrl,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      creator: '@Piece_Music_',
      site: '@piecemusic.party',
      images: [coverImageUrl],
    },
  }
}

export async function generateMetadata(
  props: EventPageProps
): Promise<Metadata> {
  const event = await getEventFromParams(props.params)

  if (!event) {
    return {
      title: 'イベントが見つかりません',
      description: `${siteConfig.name} のイベントが見つかりませんでした。`,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return buildEventMetadata(event)
}

export default async function EventPage(props: EventPageProps) {
  const event = await getEventFromParams(props.params)

  if (!event) {
    notFound()
  }

  const canonicalUrl = absoluteUrl(event.permalink)
  const coverImageUrl = event.cover
    ? absoluteUrl(event.cover)
    : defaultEventImage

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? `${event.title} | ${siteConfig.name}`,
    image: [coverImageUrl],
    startDate: toIsoDate(event.date),
    url: canonicalUrl,
    ...(event.location
      ? { location: { '@type': 'Place', name: event.location } }
      : {}),
    organizer: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/piecemusic_logo.png'),
      },
    },
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <div className="absolute inset-0 bg-background/50" />
      </div>

      <div className="container mx-auto max-w-5xl py-12 pb-32 md:pb-12 px-4 relative z-10 w-full">
        <div className="mb-8">
          <Button href="/events" variant="outline" className="group">
            <span className="group-hover:-translate-x-1 transition-transform inline-block">
              &lt;
            </span>{' '}
            他のイベントを見る
          </Button>
        </div>

        <div className="bg-card-bg/80 backdrop-blur-md border border-foreground/30 p-1 md:p-2 relative shadow-[0_0_50px_rgba(0,0,0,0.1)]">
          {/* Ticket/Card Inner Border */}
          <div className="border-2 border-dashed border-foreground/20 p-6 md:p-12 relative overflow-hidden">
            {/* background cover image; absolutely positioned so it doesn't
              affect document flow and sits behind the content */}
            {event.cover && (
              <div
                className="absolute top-8 right-8 h-full w-1/2 translate-x-1/2
                           md:w-64 md:translate-x-0 z-0 pointer-events-none"
                style={{
                  maskImage: "url('/puzzlepiece2.svg')",
                  WebkitMaskImage: "url('/puzzlepiece2.svg')",
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                }}
              >
                <div
                  className="relative h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${event.cover})`,
                  }}
                />
                {/* overlay sits above image inside mask */}
                <div className="absolute inset-0 bg-background/50 z-10" />
              </div>
            )}

            {/* Status Badge */}
            {/* Status Badge (moved to footer) */}

            {/* details section without cover taking any space */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b-2 border-foreground/10 pb-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                  <StatusBadge date={event.date} />
                  <span className="font-mono text-xl">{event.date}</span>
                </div>

                <h1 className="text-4xl font-bold font-mono tracking-tighter leading-none wrap-break-word">
                  <span data-text={event.title}>{event.title}</span>
                </h1>

                {event.location && (
                  <div className="flex items-center gap-2 text-lg">
                    <span className="text-primary-blue">📍</span>
                    <span>場所: {event.location}</span>
                  </div>
                )}

                {/* human-readable time, if provided */}
                {event.time && (
                  <div className="mt-2 flex items-center gap-2 text-lg">
                    <span className="text-primary-blue">🕒</span>
                    <span>時間: {event.time}</span>
                  </div>
                )}

                {/* Event Links / Actions now below location and horizontal */}
                {event.links && event.links.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-lg">外部リンク:</span>
                    {event.links.map((link) => (
                      <Button
                        key={link.url}
                        href={link.url}
                        variant="primary"
                        size="sm"
                        className="text-center justify-center group/link relative overflow-hidden"
                      >
                        <span className="relative z-10">{link.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-headings:uppercase prose-p:opacity-80">
              {/* Content Header Decoration */}
              <div className="flex items-center gap-4 mb-8 opacity-20 font-mono">
                <div className="h-px bg-foreground grow" />
                <span className="text-xs tracking-[0.5em]">DETAILS</span>
                <div className="h-px bg-foreground grow" />
              </div>
              <MDXContent code={event.body} />
            </div>

            {/* Barcode-ish footer */}
            {/* On small screens stack the footer content so the PIECE MUSIC text
        appears below the barcode/ID block. We revert to a row at md and above. */}
            <div className="mt-16 pt-8 border-t border-dashed border-foreground/20 flex flex-col md:flex-row justify-between items-start opacity-30 hover:opacity-100 transition-opacity">
              <div className="flex flex-col items-start gap-1">
                <div className="h-8 w-64 bg-[repeating-linear-gradient(90deg,currentColor,currentColor_1px,transparent_1px,transparent_3px)]" />
                {/* ID moved here underneath barcode */}
                <div className="font-mono text-xs tracking-widest uppercase opacity-50">
                  ID: {event.slug}
                </div>
              </div>
              <div className="font-mono text-lg self-end md:self-start mt-4 md:mt-0 text-right">
                PIECE MUSIC
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
