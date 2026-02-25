import Link from 'next/link'
import { useMemo } from 'react'
import ThemeAwareLogo from './ThemeAwareLogo'

export default function Footer() {
  const links = [
    { name: 'X (旧Twitter)', url: 'https://x.com/Piece_Music_' },
    { name: 'ニコニコ動画', url: 'https://www.nicovideo.jp/user/138839918' },
    { name: 'YouTube', url: 'https://www.youtube.com/@piece_music_pm' },
    { name: 'TID専門職大学', url: 'https://www.tid.ac.jp' },
  ]

  const logo = useMemo(
    () => (
      <ThemeAwareLogo
        width={140}
        height={140}
        className="object-contain drop-shadow-[0_0_15px_rgba(74,197,255,0.3)]"
        preload
      />
    ),
    []
  )

  return (
    <footer
      id="site-footer"
      className="bg-background text-foreground pt-16 pb-32 md:pb-8 border-t border-foreground/30 mt-auto relative z-10"
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-12">
          <div>
            <Link
              href="/"
              className="flex flex-col items-start gap-2 group hover:text-primary-blue transition-colors mb-6 tracking-tighter"
            >
              {/* logo above title */}
              {logo}
              <span className="font-bold tracking-[0.2em] text-xl md:text-2xl border-b-2 border-transparent group-hover:border-primary-blue transition-all text-left">
                PIECE MUSIC
                <br />
                (ピースミュージック)
              </span>
            </Link>
            <p className="font-mono text-xs opacity-60 max-w-md leading-relaxed pl-1 border-l-2 border-primary-blue">
              音楽って音でできてるんですね
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-1 p-px">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background border-b border-foreground/30 text-foreground px-6 py-3 text-xs font-mono font-bold uppercase hover:bg-foreground hover:text-background transition-all duration-200"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-end text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity duration-500">
          <p>
            COPYRIGHT © {new Date().getFullYear()} PIECE MUSIC. ALL RIGHTS
            RESERVED.
          </p>
          <div className="mt-2 md:mt-0 text-right">
            <span>SITE BY </span>
            <a
              href="https://x.com/stellar_dragoon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-blue hover:underline"
            >
              STELLAR DRAGOON
            </a>{' '}
            <a
              href="https://x.com/rioze_"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-blue hover:underline normal-case"
            >
              (@rioze_)
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
