import type { Metadata } from 'next'
import { works, events, posts } from '#site/content'
import HomeEvents from '@/components/HomeEvents'
import HomeWorks from '@/components/HomeWorks'
import HomeBlogSection from '@/components/HomeBlogSection'
import HomeAboutSection from '@/components/HomeAboutSection'
import HeroSection from '@/components/HeroSection'
import TwitterSection from '@/components/TwitterSection'
import { siteConfig, absoluteUrl } from '@/lib/site-config'
import VideoOpacityController from '@/components/VideoOpacityController'

const ogImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    type: 'website',
    title: siteConfig.name,
    description: siteConfig.description,
    url: absoluteUrl('/'),
    siteName: siteConfig.name,
    locale: siteConfig.locale.replace('-', '_'),
    images: [{ url: ogImage, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    creator: '@Piece_Music_',
    site: '@piecemusic.party',
    images: [ogImage],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
  logo: {
    '@type': 'ImageObject',
    url: absoluteUrl('/piecemusic_logo.png'),
  },
  sameAs: [
    siteConfig.socials.twitter,
    siteConfig.socials.youtube,
    siteConfig.socials.niconico,
  ],
}

export default function Home() {
  const highlightWorks = works.filter((w) => w.highlight).slice(0, 5)
  // Fallback to recent works if no highlights
  const displayedWorks =
    highlightWorks.length > 0 ? highlightWorks : works.slice(0, 5)

  const recentPosts = posts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    // fetch a larger batch for the homepage carousel
    .slice(0, 6)

  return (
    <div className="container mx-auto max-w-7xl px-4 md:px-6 py-8 pb-32 md:pb-8 pt-16 md:pt-8">
      <VideoOpacityController />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 1. Logo / Hero Section */}
      <HeroSection />

      {/* 2. LIVE_INFO & X_FEED */}
      <div className="flex flex-col lg:flex-row gap-12 mb-16 mt-16 items-stretch lg:items-start">
        <div className="flex-1 min-w-0 w-full">
          <HomeEvents events={events} />
        </div>
        <div className="w-full lg:w-87.5 shrink-0 lg:sticky lg:top-24">
          <TwitterSection />
        </div>
      </div>

      {/* 3. Works Highlight */}
      <HomeWorks works={displayedWorks} />

      {/* 4. Blog Feed */}
      <HomeBlogSection posts={recentPosts} />

      {/* 5. About (Philosophy, Activity, Members) */}
      <HomeAboutSection />
    </div>
  )
}
