'use client'
import { useMemo } from 'react'
import ThemeAwareLogo from './ThemeAwareLogo'
import PixelTransition from './reactbits/PixelTransition'

export default function HeroSection() {
  const fullText = '「音楽って音でできてるんですね」'

  const logo = useMemo(
    () => (
      <ThemeAwareLogo
        fill
        className="object-contain drop-shadow-[0_0_15px_rgba(74,197,255,0.05)]"
        preload
      />
    ),
    []
  )

  return (
    <section className="cursor-target min-h-[60vh] md:mt-4 md:mb-16 w-full flex flex-col md:flex-row items-center justify-center text-center md:text-left gap-12 relative overflow-hidden">
      <div className="relative h-64 w-64 md:h-96 md:w-96 animate-beat -rotate-2">
        {/* background puzzle svg tinted orange */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full text-primary-orange/80 pointer-events-none scale-110 translate-x-4 translate-y-3"
          viewBox="0 0 103 89"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M52.3288 8.70613C60.0928 -0.458865 41.1127 -0.737867 35.8477 0.570133C30.9337 1.79113 30.2458 3.97413 32.7968 8.02813C36.1168 13.3051 32.9678 14.5841 27.9398 15.4361C19.5608 16.8551 11.1388 14.9171 2.96176 13.2031C1.38976 17.7281 -0.112259 22.3511 0.204741 27.1291C0.402741 30.1161 1.26076 33.6411 3.84076 35.1681C7.59276 37.3931 11.7448 34.0841 15.5048 33.2731C24.2828 31.3811 23.8108 43.7791 20.3658 48.4871C18.2238 51.4151 14.6897 50.0001 11.9727 48.6641C8.16875 46.7921 5.97275 46.3971 2.73675 49.2211C-3.44225 57.0511 2.85476 65.1861 2.28476 73.6801C8.89476 72.3041 15.5648 70.8921 22.3318 71.2631C26.4558 71.4901 30.5148 72.4531 34.2288 74.2801C35.3108 78.4651 28.5558 82.7171 31.7418 85.7191C37.2618 90.9211 48.6788 88.8501 54.2818 84.7731C55.1068 81.2141 50.8128 80.3141 50.5428 76.9621C50.1868 72.5421 59.0678 71.5661 62.1258 71.2201C68.3778 70.5131 74.6078 71.5011 80.8198 72.7501C80.3898 69.8231 79.7987 66.8851 79.7747 63.5181C79.7357 58.1111 80.8418 44.4381 89.2078 47.4441C95.8978 49.8481 101.325 52.1311 102.679 42.6711C103.196 39.0611 102.282 35.5171 99.2888 33.2221C94.7748 32.1491 91.0928 35.8211 86.7088 35.8961C77.6378 36.0511 79.7808 24.0521 82.6888 13.5841C79.0138 14.3461 75.3407 15.1181 71.6237 15.6161C66.8857 16.2501 45.0478 17.3011 52.3288 8.70613Z"
          />
        </svg>

        <PixelTransition
          gridSize={12}
          pixelColor="#4ac5ff" // primary-blue
          animationDuration={0.8}
          className="w-full h-full"
          pixelOpacity={0.5}
        >
          {logo}
        </PixelTransition>
      </div>

      <div className="space-y-6 z-10">
        <h1 className="text-5xl md:text-7xl font-bold font-dot relative rotate-1">
          <span className="text-primary-blue inline-block hover:animate-glitch">
            PIECE
          </span>
          <br className="md:hidden" />
          <span className="text-foreground inline-block hover:animate-glitch md:ml-4">
            MUSIC
          </span>
        </h1>

        <div className="relative inline-block">
          <p
            style={{
              clipPath:
                'polygon(0% 15%, 3% 15%, 3% 0, 97% 0, 97% 15%, 100% 15%, 100% 85%, 97% 85%, 97% 100%, 3% 100%, 3% 85%, 0% 85%)',
            }}
            className={`font-mono rotate-1 text-sm md:text-base bg-primary-orange/90 text-foreground px-6 py-3 tracking-widest relative group hover:translate-x-1 hover:translate-y-1 transition-all duration-200`}
          >
            <span className="mr-2 opacity-75 text-[10px] absolute top-1 left-6">
              ピースミュージック
            </span>
            <br />
            {fullText}
            <span className="animate-pulse">!!!</span>
          </p>
        </div>

        <div className="flex gap-4 justify-center md:justify-start pt-4 text-xs rotate-1">
          <svg
            aria-hidden="true"
            className="w-full h-2"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="sawtooth"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 0 5 L 5 0 L 10 5"
                  fill="none"
                  stroke="var(--primary-blue)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#sawtooth)"
              className="animate-marquee"
            />
          </svg>
          <style jsx>{`
            @keyframes marquee {
              from {
                transform: translateX(0);
              }
              to {
                transform: translateX(-10px);
              }
            }
            .animate-marquee {
              animation: marquee 0.8s linear infinite;
            }
          `}</style>
        </div>
      </div>
    </section>
  )
}
