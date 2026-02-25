import type { Metadata } from 'next'
import { Geist, Fira_Code, DotGothic16, Klee_One } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import VideoBackground from '@/components/VideoBackground'
import { siteConfig, absoluteUrl } from '@/lib/site-config'
import { Providers } from './providers'
import ClickSpark from '@/components/reactbits/ClickSpark'
import TargetCursor from '@/components/reactbits/TargetCursor'
import ScrollEndSequence from '@/components/ScrollEndSequence'

const geistSans = Geist({
  variable: '--font-geist-sans-internal',
  subsets: ['latin'],
})

const firaCode = Fira_Code({
  variable: '--font-fira-code-internal',
  subsets: ['latin'],
})

const dotGothic = DotGothic16({
  weight: '400',
  variable: '--font-dot-gothic-internal',
  preload: false,
  display: 'swap',
})

const kleeOne = Klee_One({
  weight: ['400', '600'],
  variable: '--font-klee-one-internal',
  preload: false,
  display: 'swap',
})

const metadataBase = (() => {
  try {
    return new URL(siteConfig.url)
  } catch {
    return new URL('https://piecemusic.party')
  }
})()

const defaultOgImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.defaultKeywords,
  category: 'Music',
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: siteConfig.locale.replace('-', '_'),
    images: [
      {
        url: defaultOgImage,
        width: 1500,
        height: 500,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    creator: '@Piece_Music_',
    site: '@piecemusic.party',
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${firaCode.variable} ${dotGothic.variable} ${kleeOne.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`
            antialiased w-full overflow-x-hidden font-sans
            flex flex-col min-h-screen
          `} // structure the entire screen
      >
        <Providers>
          {/* Skip navigation link — first focusable element for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:border-foreground/30 focus:font-mono focus:text-sm"
          >
            メインコンテンツへスキップ
          </a>

          {/* Video background — intentionally outside page-fade-wrapper so it is never faded */}
          <VideoBackground src="/static/background.mp4" />

          {/* Everything rendered here fades to 0 during the scroll-end sequence */}
          <div id="page-fade-wrapper">
            <TargetCursor
              // adjust how fast the "beat" animation cycles (seconds)
              beatDuration={0.8}
              parallaxOn={true}
              hideDefaultCursor={false}
            />

            <ClickSpark
              sparkColor="#00bcd4"
              sparkSize={10}
              sparkRadius={15}
              sparkCount={8}
              duration={400}
            >
              <Navbar />

              {/* add left padding on md screens to account for the sidebar now on the left */}
              <div className="flex flex-col min-h-screen md:pl-18">
                <main id="main-content" className="grow">
                  {children}
                </main>
                <Footer />
              </div>
            </ClickSpark>
          </div>

          {/* Scroll-end cinematic sequence — sibling of page-fade-wrapper so its
              fixed overlays are never clipped by the parent opacity context */}
          <ScrollEndSequence />
        </Providers>
      </body>
    </html>
  )
}
