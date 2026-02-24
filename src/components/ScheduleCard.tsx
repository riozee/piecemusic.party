'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import DateBlock from './DateBlock'

// status is derived from the event date at runtime rather than stored
// in the content.  This allows us to drop the field from frontmatter.
// Use the generated Event type so we stay in sync with content schema.
import { Event } from '#site/content'

interface ScheduleCardProps {
  events: Event[]
}

export default function ScheduleCard({ events }: ScheduleCardProps) {
  // keep track of current time on client so countdown updates
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 bg-card-bg border border-foreground/20 shadow-[0_0_50px_rgba(0,0,0,0.1)] -rotate-1">
        <div className="flex items-center gap-4">
          <div className="animate-pulse text-2xl">⚠️</div>
          <div className="flex flex-col">
            <h3
              className="text-sm font-bold font-mono glitch-text"
              data-text="NO_UPCOMING_EVENTS"
            >
              NO_UPCOMING_EVENTS
            </h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="space-y-6 relative z-10 w-full">
        {events.map((event) => {
          const isUpcoming =
            new Date(event.date).getTime() >= now
              ? // calculate diffDays based on dynamic now
                Math.ceil(
                  (new Date(event.date).getTime() - now) / (1000 * 60 * 60 * 24)
                )
              : null
          return (
            <div
              key={event.slug}
              className="cursor-target group relative transition-transform hover:rotate-0 duration-200 w-full"
            >
              <Link href={event.permalink} className="block w-full">
                <div className="relative w-full transition-all duration-300 group-hover:shadow-[0_0_50px_rgba(0,0,0,0.2)]">
                  {/* cover background cutout */}
                  {event.cover ? (
                    // the wrapper ensures the rotated image is clipped by the same
                    // shape as the card and allows us to scale it slightly to
                    // avoid gaps at the edges after rotation
                    <div
                      className="absolute inset-0 pointer-events-none overflow-hidden"
                      style={{
                        clipPath:
                          'polygon(0% 0%, 100% 0%, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0% 100%)',
                      }}
                    >
                      {/* background image; keep at the bottom of this wrapper */}
                      <div
                        className="absolute inset-0 bg-cover bg-center z-0"
                        style={{
                          backgroundImage: `url(${event.cover})`,
                        }}
                      />
                      {/* dark overlay on top of the image to make it appear darker */}
                      <div className="absolute inset-0 bg-black/70 z-0 pointer-events-none" />
                    </div>
                  ) : (
                    // no cover? show a subtle orange background instead, clipped
                    // to match the same shape as when an image is present
                    <div
                      className="absolute inset-0 pointer-events-none overflow-hidden"
                      style={{
                        clipPath:
                          'polygon(0% 0%, 100% 0%, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0% 100%)',
                      }}
                    >
                      <div className="absolute inset-0 bg-primary-orange/40" />
                    </div>
                  )}
                  {/* always show puzzle-piece overlay on left side */}
                  <div
                    className="absolute inset-0 pointer-events-none overflow-hidden"
                    style={{
                      clipPath:
                        'polygon(0% 0%, 100% 0%, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0% 100%)',
                    }}
                  >
                    {/* lower the overlay by reducing the upward translate */}
                    <div className="absolute top-0 left-0 w-64 h-64 -translate-x-1/32 -translate-y-1/16 pointer-events-none rotate-6 scale-150 z-20">
                      {/* inline puzzle piece SVG filled with semi-transparent black */}
                      <svg
                        viewBox="0 0 102 64"
                        className="w-full h-full"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M82.224 36.644C89.2 34.464 97.256 45.711 99.931 33.396C103.525 16.853 89.565 26.924 82.312 25.104C76.823 20.997 77.059 14.334 78.832 7.95201C79.516 5.49101 80.423 3.01001 81.289 0.504013C78.133 0.522013 74.978 0.622008 71.831 0.818008C65.916 1.18701 60.02 1.85801 54.17 2.80101C50.299 3.42401 45.576 4.60902 49.406 9.27602C52.215 12.697 52.976 14.156 48.167 16.253C44.387 17.9 40.134 18.36 36.065 17.786C32.19 17.24 26.103 15.56 29.398 10.816C32.223 6.75002 33.318 3.78601 28.026 1.68901C21.759 -0.791989 9.416 1.73102 0.5 3.62502V62.919H78.298C76.005 55.042 79.564 39.686 82.224 36.644Z"
                          className="fill-primary-blue/20"
                        />
                      </svg>
                    </div>
                    {/* right-side repeat of the cover image; fixed width container that crops the image */}
                    {event.cover ? (
                      <div className="absolute top-0 bottom-0 right-0 w-32 md:w-64 overflow-hidden z-0 pointer-events-none">
                        <div className="absolute inset-0 w-full h-full">
                          {/* dark overlay behind image */}
                          <div className="absolute inset-0 bg-primary-blue" />
                          <Image
                            src={event.cover}
                            alt="event cover"
                            fill
                            className="object-cover object-center"
                            priority={false}
                          />
                          {/* light overlay on top of image for subtle dimming */}
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute top-0 bottom-0 right-0 w-32 md:w-64 bg-primary-orange/40" />
                    )}
                  </div>
                  {/* clipped content */}
                  <div
                    style={{
                      clipPath:
                        'polygon(0% 0%, 100% 0%, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0% 100%)',
                    }}
                    className="relative z-10 flex min-h-32 flex-col items-start justify-center p-8 pl-4 md:pl-8 shadow-[0_0_50px_rgba(0,0,0,0.1)] gap-4 w-full"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {/* Date block with status stacked */}
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-mono uppercase tracking-tighter ${
                            isUpcoming
                              ? 'bg-primary-blue text-black animate-pulse'
                              : 'bg-primary-white/50 text-primary-black'
                          }`}
                        >
                          {isUpcoming ? '開催予定' : '過去'}
                        </span>
                        <DateBlock
                          date={event.date}
                          backgroundColor="black"
                          textColor="white"
                        />
                        {/* countdown if the event is upcoming and within 15 days */}
                        {isUpcoming &&
                          (() => {
                            const now = new Date().getTime()
                            const eventTime = new Date(event.date).getTime()
                            const diffDays = Math.ceil(
                              (eventTime - now) / (1000 * 60 * 60 * 24)
                            )
                            return diffDays >= 0 && diffDays < 15 ? (
                              <span className="px-2 py-0.5 text-xs font-mono tracking-tighter bg-primary-orange text-black">
                                あと{diffDays}日
                              </span>
                            ) : null
                          })()}
                      </div>

                      <div className="flex flex-col gap-1 text-primary-white text-shadow-lg">
                        <h3 className="text-lg md:text-2xl font-bold group-hover:text-primary-blue transition-colors line-clamp-1">
                          <span data-text={event.title}>{event.title}</span>
                        </h3>

                        {/* Location */}
                        {/* Time only (human-readable) */}
                        {event.time && (
                          <div className="flex items-center gap-1 text-xs md:text-sm font-bold">
                            <span className="text-primary-blue">時間:</span>
                            <span className="truncate max-w-37.5">
                              {event.time}
                            </span>
                          </div>
                        )}
                        {/* Location */}
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs md:text-sm font-bold">
                            <span className="text-primary-blue">場所:</span>
                            <span className="truncate max-w-37.5">
                              {event.location}
                            </span>
                          </div>
                        )}
                        {/* Description */}
                        {event.description && (
                          <p className="text-xs md:text-sm font-bold line-clamp-3 max-w-3/4">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* border overlays replicating shape */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* top edge */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-foreground/20" />
                    {/* left edge */}
                    <div className="absolute top-0 left-0 bottom-0 w-px bg-foreground/20" />
                    {/* bottom edge until cut */}
                    <div className="absolute bottom-0 left-0 h-px w-[calc(100%-24px)] bg-foreground/20" />
                    {/* right edge until cut */}
                    <div className="absolute top-0 right-0 w-px h-[calc(100%-24px)] bg-foreground/20" />
                    {/* diagonal border segment matching clipped corner (backslash), nudged upward */}
                    <div className="absolute bottom-0 right-0 w-8 h-px bg-foreground/20 -rotate-45 origin-bottom-right -translate-y-6" />
                  </div>
                  {/* end relative wrapper */}
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
