'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import Link from 'next/link'
import NavScreen from './NavScreen'
import { events, Event } from '#site/content'
import ScheduleCard from './ScheduleCard'
import DateBlock from './DateBlock'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showScroll, setShowScroll] = useState(false)
  const [bottomInset, setBottomInset] = useState(0)

  // show scroll-to-top button after user scrolls a bit
  useEffect(() => {
    const onScroll = () => {
      setShowScroll(window.pageYOffset > 200)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // compute additional bottom offset to avoid overlapping footer
  // isOpen is a dependency so the closure always sees the latest value;
  // when the menu is open, always force inset to 0 (no race condition)
  useEffect(() => {
    const updateInset = () => {
      if (isOpen) {
        setBottomInset(0)
        return
      }
      const f = document.getElementById('site-footer')
      if (!f) return
      const overlap = Math.max(
        0,
        window.innerHeight - f.getBoundingClientRect().top
      )
      setBottomInset(overlap)
    }
    window.addEventListener('scroll', updateInset)
    window.addEventListener('resize', updateInset)
    updateInset()
    return () => {
      window.removeEventListener('scroll', updateInset)
      window.removeEventListener('resize', updateInset)
    }
  }, [isOpen])

  const navLinks = [
    { name: 'ホーム', href: '/', id: '01' },
    { name: '作品', href: '/works', id: '02' },
    { name: 'イベント', href: '/events', id: '03' },
    { name: 'ブログ', href: '/blog', id: '04' },
    { name: 'サークル概要', href: '/about', id: '05' },
    { name: 'ダウンロード', href: '/download', id: '06' },
  ]

  return (
    <>
      {/* Persistent Vertical Bar/Trigger Container */}
      {/* moved from right edge to left edge */}
      <nav
        aria-label="メインナビゲーション"
        className="fixed left-0 top-0 h-full z-50 flex flex-col items-center pointer-events-none"
      >
        {/* Desktop Vertical Bar */}
        {/* border now on the right side of the bar since bar is on left */}
        <div className="hidden md:flex h-full w-18 bg-background/80 backdrop-blur-md border-r border-foreground/10 flex-col items-center justify-between py-12 pointer-events-auto">
          {/* top indicator shows next upcoming event date (desktop only) */}
          <EventIndicator />

          <div className="flex-1 flex items-center justify-center">
            {/* vertical text should flow left-to-right now that bar is on left edge */}
            {/* make the site title a link back to home */}
            <Link
              href="/"
              className="cursor-target font-bold text-xl tracking-[0.4em] [writing-mode:vertical-lr] select-none text-foreground/80"
            >
              ピースミュージック
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="nav-menu"
            className="cursor-target group flex flex-col gap-1.5 items-center justify-center p-4 hover:text-primary-blue transition-colors focus:outline-none"
            aria-label="メニューを開く"
          >
            <div
              className={`w-6 h-0.5 bg-current transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}
            />
            <div
              className={`w-6 h-0.5 bg-current transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}
            />
            <div
              className={`w-6 h-0.5 bg-current transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}
            />
          </button>
        </div>

        {/* Mobile Hamburger Only (Bottom Left with Margin and Safe Area) */}
        <div
          className="md:hidden fixed left-[calc(1.5rem+env(safe-area-inset-left))] pointer-events-auto"
          style={{
            bottom: `calc(1.5rem + env(safe-area-inset-bottom) + ${bottomInset}px)`,
          }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="nav-menu"
            className="w-14 h-14 bg-background/90 backdrop-blur-md border border-foreground/10 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
            aria-label="メニューを開く"
          >
            <div className="flex flex-col gap-1.5 items-center">
              <span
                className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}
              ></span>
              <span
                className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}
              ></span>
              <span
                className={`w-6 h-0.5 bg-foreground transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}
              ></span>
            </div>
          </button>
        </div>

        {/* Scroll-to-top button (floating, respects bottom inset). previously mobile only; now shown on all viewports */}
        {showScroll && (
          <div
            className="fixed right-[calc(1.5rem+env(safe-area-inset-right))] pointer-events-auto"
            style={{
              bottom: `calc(1.5rem + env(safe-area-inset-bottom) + ${bottomInset}px)`,
            }}
          >
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-14 h-14 bg-background/90 backdrop-blur-md border border-foreground/10 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
              aria-label="Scroll to top"
            >
              <span className="text-2xl font-bold text-foreground">^</span>
            </button>
          </div>
        )}
      </nav>

      {/* Identical Menu Overlay for Desktop and Mobile */}
      <AnimatePresence>
        {isOpen && (
          <NavScreen navLinks={navLinks} onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// separate component so logic doesn't clutter main menu component
function EventIndicator() {
  // determine next upcoming event from the global content list
  // compute all upcoming events (no fallback to past)
  // compute upcoming events based solely on date
  const isUpcoming = (evtDate: string) => {
    try {
      return new Date(evtDate).getTime() >= new Date().getTime()
    } catch {
      return false
    }
  }

  const upcomingEvents: Event[] = events
    .filter((e) => isUpcoming(e.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const nextEvent = upcomingEvents[0]

  if (!nextEvent) {
    return <></>
  }

  return (
    // stack entries vertically along bar
    <div className="flex flex-col gap-2">
      {upcomingEvents.map((ev) => (
        <div
          key={ev.slug}
          className="cursor-target relative group flex items-center justify-center"
        >
          {/* clickable indicator itself */}
          <Link
            href={ev.permalink}
            aria-label={`イベント: ${ev.title}`}
            className="flex items-center justify-center"
          >
            {/* small date block indicator */}
            <DateBlock date={ev.date} size="3rem" />
            {/* glowing dot next to block (now on the left since navbar is on left) */}
            <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary-orange rounded-full animate-pulse" />
          </Link>

          {/* tooltip for this particular date (position to right of bar instead of left) */}
          <div className="absolute left-full top-0 ml-4 hidden group-hover:block z-50">
            <div className="min-w-[50vw]">
              <ScheduleCard events={[ev]} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
