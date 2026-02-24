import AboutSection from '@/components/AboutSection'
import ThemeAwareLogo from '@/components/ThemeAwareLogo'
import Button from '@/components/Button'
import { Metadata } from 'next'
import { siteConfig, absoluteUrl } from '@/lib/site-config'

const title = 'サークル概要'
const description = 'Piece Musicの理念、活動内容、メンバーについて。'
const url = absoluteUrl('/about')
const ogImage = absoluteUrl(siteConfig.defaultOgImage)

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    ...siteConfig.defaultKeywords,
    'サークル概要',
    'メンバー',
    '活動内容',
  ],
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

const puzzlePath =
  'M96.0115 61.7759C94.7405 55.0919 97.6465 44.1149 106.339 48.1219C109.35 49.5109 113.559 52.0619 116.09 48.6019C118.061 45.9079 119.084 42.3569 118.46 39.0389C116.363 27.9069 106.872 37.2689 100.446 35.9019C91.7915 29.5359 97.1255 23.0819 97.9765 14.2489C97.9915 14.0979 97.9975 13.9459 98.0085 13.7949C96.5165 14.1069 95.0285 14.4149 93.5425 14.7009C84.5715 16.4299 75.2175 17.3519 66.5425 13.8079C64.9025 9.26593 71.0405 7.89294 70.0075 3.33894C66.9445 0.822937 62.1125 0.148951 58.2135 0.0219515C54.8985 -0.0860485 48.4255 0.0719302 46.8945 3.64393C45.4935 6.91093 51.1865 9.75593 49.9375 13.8119C41.8715 16.9839 33.2305 16.207 24.9135 14.6C22.7565 14.183 20.5925 13.7139 18.4215 13.2569C19.6755 16.6889 20.9345 20.1169 21.4815 23.7409C21.9445 26.8039 21.7665 29.9409 20.5795 32.8289C18.7415 37.2959 13.9895 36.1179 10.0155 34.4049C1.67852 30.8109 -2.93849 40.3659 2.07951 46.9479C7.71351 54.3369 15.7895 42.7689 19.5235 49.3289C23.4475 56.2249 20.8535 63.7999 19.8795 71.1829C25.0535 71.1679 30.2275 71.4079 35.3715 71.9509C40.2755 72.4689 45.1525 73.262 49.9535 74.393C51.0355 78.578 44.2805 82.8299 47.4665 85.8319C52.9865 91.0339 64.4035 88.9629 70.0065 84.8859C70.8315 81.3269 66.5375 80.4269 66.2675 77.0749C65.9315 72.9199 74.8925 72.4599 77.7945 71.8729C82.0025 71.0209 86.3725 70.4619 90.6565 71.0559C93.6955 71.4779 95.7185 72.566 98.0265 73.035C98.0725 69.224 96.7165 65.4769 96.0115 61.7759Z'

export default function AboutPage() {
  return (
    <div className="pb-24">
      <div className="max-w-7xl mx-4 md:mx-auto">
        <div className="w-[90%] max-w-5xl mx-auto pt-12 mb-4">
          <Button href="/" variant="outline" className="group">
            <span className="group-hover:-translate-x-1 transition-transform inline-block">
              &lt;
            </span>{' '}
            ホームへ戻る
          </Button>
        </div>

        <div className="mt-24">
          <AboutSection />
        </div>

        {/* Identity section */}
        <section className="relative mt-16">
          <div className="container mx-auto md:px-12 relative">
            <div className="bg-card-bg border border-foreground/30 p-8 md:p-12 relative overflow-hidden backdrop-blur-sm shadow-xl">
              {/* puzzle piece decorations */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <svg
                  className="absolute top-8 right-8 scale-[2] md:top-16 md:right-16 md:scale-[3.5] w-24 h-24 fill-primary-blue/20 rotate-12"
                  viewBox="0 0 119 89"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path fillRule="evenodd" clipRule="evenodd" d={puzzlePath} />
                </svg>

                <svg
                  className="absolute bottom-8 left-8 scale-[2] md:bottom-16 md:left-16 md:scale-[3.5] w-24 h-24 fill-primary-orange/20 -rotate-12"
                  viewBox="0 0 119 89"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path fillRule="evenodd" clipRule="evenodd" d={puzzlePath} />
                </svg>
              </div>

              {/* content */}
              <div className="relative z-10 flex flex-col items-center text-center gap-6 py-8">
                <div className="w-24 h-24 relative">
                  <ThemeAwareLogo fill className="object-contain" preload />
                </div>

                <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tighter">
                  PIECE MUSIC
                </h2>

                <p className="max-w-xl text-sm font-mono opacity-70 leading-relaxed">
                  ...
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
