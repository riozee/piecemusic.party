import Link from 'next/link'
import { motion } from 'motion/react'
// theme toggling moved into the play button so we no longer render a
// dedicated ThemeSwitcher component here.
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import {
  Shuffle,
  SkipBack,
  Play,
  SkipForward,
  Repeat2,
  ListMusic,
  Music2,
  Radio,
  Disc3,
  AudioLines,
  Sparkles,
  DownloadCloud,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface NavScreenProps {
  navLinks: { name: string; href: string; id: string }[]
  onClose: () => void
}

export default function NavScreen({ navLinks, onClose }: NavScreenProps) {
  const pathname = usePathname()
  const [scrollProgress, setScrollProgress] = useState(0)

  // theme handling moved from standalone component into this menu so the
  // "Play" button can actually toggle light/dark. we track mounted to
  // avoid mismatched rendering on the server.
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (!resolvedTheme) return
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const coverIcons = useMemo(
    () => [Music2, Disc3, Radio, AudioLines, Sparkles, DownloadCloud],
    []
  )

  const playlist = useMemo(
    () =>
      navLinks.map((link, index) => {
        const minutes = 3 + Math.floor(index / 2)
        const seconds = (index * 17) % 60
        const duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

        return {
          ...link,
          duration,
          active: pathname === link.href,
        }
      }),
    [navLinks, pathname]
  )

  useEffect(() => {
    // Lock page scrolling while the menu overlay is mounted. The overlay itself
    // should be fixed and only the internal playlist should scroll. Without
    // this the background document can still scroll which feels wrong when the
    // menu is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // separate effect for tracking scroll progress of the background page. this
  // updates a fake "playhead" style progress bar in the menu
  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight

      if (maxScroll <= 0) {
        setScrollProgress(0)
        return
      }

      const nextProgress = Math.min(
        100,
        Math.max(0, (scrollTop / maxScroll) * 100)
      )
      setScrollProgress(nextProgress)
    }

    updateScrollProgress()
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    window.addEventListener('resize', updateScrollProgress)

    return () => {
      window.removeEventListener('scroll', updateScrollProgress)
      window.removeEventListener('resize', updateScrollProgress)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/95 backdrop-blur-2xl z-40"
    >
      <div className="mx-auto w-full max-w-5xl h-full px-6 md:px-8 py-6 md:py-10 grid grid-rows-[1fr_auto] gap-6">
        {/* playlist panel; use flex layout so scroll area can shrink properly */}
        <div className="group w-full border border-foreground/10 bg-card-bg text-foreground shadow-sm flex flex-col overflow-hidden rounded-2xl transition-[border-radius] duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
              <ListMusic size={14} className="text-primary-blue" />
              メニュー
            </div>
            <div className="font-mono text-xs opacity-60">再生リスト</div>
          </div>

          {/* flex-1 ensures this div only fills available space beneath header */}
          <div className="flex-1 overflow-y-auto">
            {playlist.map((link, i) => {
              const CoverIcon = coverIcons[i % coverIcons.length]
              return (
                <motion.div
                  key={link.name}
                  initial={{ x: -24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`cursor-target group/row grid grid-cols-[42px_1fr_auto] items-center gap-3 px-6 py-4 md:py-6 border-b border-foreground/10 transition-all rounded-lg ${
                      link.active ? 'bg-foreground/5' : 'hover:bg-foreground/2'
                    }`}
                  >
                    <span
                      className={`relative h-9 w-9 grid place-items-center border border-foreground/15 bg-background text-foreground overflow-hidden rounded-lg group-hover/row:rounded-xl transition-[border-radius] duration-200 ${
                        link.active ? 'ring-1 ring-primary-blue/50' : ''
                      }`}
                      aria-hidden
                    >
                      <span className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_30%_30%,rgba(0,188,212,0.22),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(245,0,87,0.18),transparent_55%)]" />
                      <CoverIcon
                        size={16}
                        className="relative text-primary-blue"
                      />
                    </span>

                    <span
                      className={`text-base md:text-lg font-bold tracking-tight transition-colors ${
                        link.active ? 'text-primary-blue' : 'text-foreground'
                      }`}
                    >
                      {link.name}
                    </span>
                    <span className="font-mono text-xs opacity-60 tabular-nums">
                      {link.duration}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* player controller; give extra vertical padding so it feels more substantial */}
        <div className="group w-full border border-foreground/10 bg-card-bg text-foreground shadow-sm mb-20 md:mb-0 px-4 md:px-6 py-6 md:py-8 rounded-2xl transition-[border-radius] duration-200">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs opacity-60 tabular-nums">
              {new Date((scrollProgress / 100) * 180 * 1000)
                .toISOString()
                .substr(14, 5)}
            </span>
            <div className="relative h-1.5 flex-1 bg-foreground/10 overflow-hidden rounded-full transition-[border-radius] duration-200">
              <div
                className="absolute inset-y-0 left-0 bg-primary-blue transition-all duration-200"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            <span className="font-mono text-xs opacity-60">03:00</span>
          </div>

          {/* controls row: center items on small screens, keep spacing on larger */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="hidden sm:inline-flex p-2 border border-foreground/15 bg-background hover:bg-foreground/5 transition-colors rounded-lg hover:rounded-xl"
                aria-label="Shuffle"
              >
                <Shuffle size={18} className="text-primary-blue" />
              </button>
              <button
                type="button"
                className="p-2 border border-foreground/15 bg-background hover:bg-foreground/5 transition-colors rounded-lg hover:rounded-xl"
                aria-label="Previous"
              >
                <SkipBack size={20} className="text-foreground" />
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="cursor-target px-6 py-3 sm:px-4 sm:py-2 border border-foreground/20 bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-lg hover:rounded-xl"
                aria-label="Toggle Theme"
              >
                <span className="inline-flex items-center gap-2">
                  <Play size={18} fill="currentColor" />
                  <span className="text-sm font-semibold">
                    {mounted && resolvedTheme
                      ? resolvedTheme === 'dark'
                        ? 'ライトモード'
                        : 'ダークモード'
                      : 'Play'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="p-2 border border-foreground/15 bg-background hover:bg-foreground/5 transition-colors rounded-lg hover:rounded-xl"
                aria-label="Next"
              >
                <SkipForward size={20} className="text-foreground" />
              </button>
              <button
                type="button"
                className="hidden sm:inline-flex p-2 border border-foreground/15 bg-background hover:bg-foreground/5 transition-colors rounded-lg hover:rounded-xl"
                aria-label="Repeat"
              >
                <Repeat2 size={18} className="text-primary-pink" />
              </button>
            </div>

            <div className="hidden sm:flex items-end gap-4">
              <div className="font-mono text-[10px] md:text-xs opacity-50 leading-relaxed uppercase tracking-widest text-right">
                Piece Music
                <br />
                Est. 2024 / Rev. 2026
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
