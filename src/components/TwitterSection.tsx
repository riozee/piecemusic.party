'use client'

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react'
import Image from 'next/image'

// ── Image viewer context ──────────────────────────────────────────────────────

/** Call with an image src to open the in-section lightbox */
const ImageViewerContext = createContext<(src: string) => void>(() => {})

// ── Types ────────────────────────────────────────────────────────────────────

interface TweetAuthor {
  displayName: string | null
  handle: string | null
}

interface TweetEngagement {
  replies: number
  reposts: number
  likes: number
  views: number
  bookmarks: number
}

interface TweetCard {
  thumbnailUrl: string | null
  title: string | null
}

interface Tweet {
  id: string
  url: string
  date: string
  text: string | null
  author: TweetAuthor | null
  avatarUrl: string | null
  images: string[] | null
  card: TweetCard | null
  engagement: TweetEngagement
  socialContext: string | null
  isRepost: boolean
  isPinned: boolean
}

interface TweetsData {
  updatedAt: string
  data: Tweet[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n > 0 ? String(n) : ''
}

// hash a string into a nonnegative integer
function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Return avatar rendering info based on a handle.
 * - @Piece_Music_ -> use the logo image
 * - others -> show first two chars (sans @) on a colored background
 */
function avatarForHandle(handle: string | null, displayName?: string | null) {
  if (!handle) {
    return { type: 'initial', initials: '??', bgColor: 'var(--foreground/10)' }
  }
  if (handle === '@Piece_Music_') {
    return { type: 'logo', src: '/piecemusic_logo-light.png' }
  }
  // initials from displayName when available, else derive from handle
  let base = displayName || handle.replace(/^@/, '')
  base = base.trim()
  const initials = base.slice(0, 2).toUpperCase() || '?' // at least one char
  const hue = hashCode(handle) % 360 // still derive hue from handle so it remains consistent
  const bgColor = `hsl(${hue}, 60%, 70%)`
  return { type: 'initial', initials, bgColor }
}

/** Returns true if a token looks like a Twitter-clamped URL display label.
 *  This covers both "example.com/path…" (non-URL clamped label) and
 *  "https://longurl.com/path…" (full URL emitted by the scraper as display text). */
function looksLikeClamped(s: string) {
  return !s.startsWith('@') && !s.startsWith('#') && s.includes('.')
}

/** Render tweet text: turn hashtags, mentions, and URLs into clickable links.
 *  Twitter appends a t.co short URL after each clamped display label in the
 *  raw tweet text (e.g. "example.com/path… https://t.co/abc123").  We detect
 *  that pattern and render the clamped label as the link text while using the
 *  t.co URL as the href, suppressing the raw t.co token from display. */
function renderText(text: string) {
  const parts = text.split(/(\s+)/)

  // Pre-pass: for every t.co URL, check if the immediately preceding
  // non-whitespace token looks like a clamped display label.  If so, pair them.
  const linkedTo = new Map<number, string>() // part-index → href
  const skipIdx = new Set<number>() // indices to omit from output

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (/^https?:\/\/t\.co\//.test(part)) {
      let prev = i - 1
      while (prev >= 0 && /^\s+$/.test(parts[prev])) prev--
      if (prev >= 0 && looksLikeClamped(parts[prev])) {
        linkedTo.set(prev, part)
        skipIdx.add(i) // hide the raw t.co token
        // also hide whitespace between the clamped label and the t.co token
        for (let j = prev + 1; j < i; j++) skipIdx.add(j)
      }
    }
  }

  return parts.map((part, i) => {
    if (skipIdx.has(i)) return null

    // Clamped display label paired with a t.co href
    if (linkedTo.has(i)) {
      return (
        <a
          key={i}
          href={linkedTo.get(i)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-blue hover:underline break-all"
        >
          {part}
        </a>
      )
    }

    if (part.startsWith('#')) {
      return (
        <a
          key={i}
          href={`https://x.com/hashtag/${encodeURIComponent(part.slice(1))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-blue hover:underline"
        >
          {part}
        </a>
      )
    }
    if (part.startsWith('@')) {
      return (
        <a
          key={i}
          href={`https://x.com/${part.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-blue hover:underline"
        >
          {part}
        </a>
      )
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
      // Non-t.co URL: strip protocol/trailing slash and truncate for display
      const display = part.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const label = display.length > 40 ? display.slice(0, 40) + '…' : display
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-blue hover:underline break-all"
        >
          {label}
        </a>
      )
    }
    return part
  })
}

// ── Sub-components ─────────────────────────────────────────────────────────

function EngagementBtn({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode
  count: number
  label: string
}) {
  const formatted = formatCount(count)
  return (
    <div
      className="flex items-center gap-1 text-foreground/40 group/btn"
      aria-label={label}
    >
      <span className="w-8 h-8 flex items-center justify-center rounded-full group-hover/btn:bg-primary-blue/10 group-hover/btn:text-primary-blue transition-colors">
        {icon}
      </span>
      {formatted && (
        <span className="text-xs tabular-nums group-hover/btn:text-primary-blue transition-colors">
          {formatted}
        </span>
      )}
    </div>
  )
}

function TweetCard({ tweet }: { tweet: Tweet }) {
  const openImage = useContext(ImageViewerContext)
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState(false)

  const handleImgError = useCallback((src: string) => {
    setImgErrors((prev) => ({ ...prev, [src]: true }))
  }, [])

  const images = (tweet.images ?? []).filter((src) => !imgErrors[src])
  const hasCard =
    tweet.card?.thumbnailUrl && !imgErrors[tweet.card.thumbnailUrl]

  // avatar calculation
  const handle = tweet.author?.handle ?? ''
  const displayName = tweet.author?.displayName ?? ''
  const avatar = avatarForHandle(handle, displayName)

  // Clamp long text: show "さらに表示" when text is over ~120 chars
  const isLong = (tweet.text?.length ?? 0) > 120

  return (
    <article className="px-4 py-3 border-b border-foreground/10 hover:bg-foreground/3 transition-colors">
      {/* Social context (pinned / repost label) */}
      {tweet.socialContext && (
        <div className="flex items-center gap-2 mb-1 ml-10 text-foreground/50 text-xs font-medium">
          {tweet.socialContext === '固定' ? (
            '固定'
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
              </svg>
              {tweet.socialContext}
            </>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <a
          href={`https://x.com/${handle.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
          tabIndex={-1}
        >
          <div
            className="w-10 h-10 rounded-full overflow-hidden"
            style={{ background: avatar.bgColor || 'var(--foreground/10)' }}
          >
            {avatar.type === 'logo' ? (
              <Image
                src={avatar.src!}
                alt="avatar"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold pb-1">
                {avatar.initials}
              </div>
            )}
          </div>
        </a>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-1 flex-wrap">
            <a
              href={`https://x.com/${tweet.author?.handle?.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-sm text-foreground hover:underline truncate max-w-30"
            >
              {tweet.author?.displayName ?? 'Unknown'}
            </a>
            <span className="text-foreground/40 text-sm truncate max-w-25">
              {tweet.author?.handle}
            </span>
            <span className="text-foreground/30 text-sm">·</span>
            <a
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/40 text-sm hover:text-primary-blue transition-colors shrink-0"
            >
              {formatDate(tweet.date)}
            </a>
          </div>

          {/* Tweet text */}
          {tweet.text && (
            <div className="mt-0.5">
              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
                  isLong && !expanded ? 'line-clamp-4' : ''
                }`}
              >
                {renderText(tweet.text)}
              </p>
              {isLong && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-sm text-primary-blue hover:underline mt-0.5 cursor-pointer"
                >
                  さらに表示
                </button>
              )}
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div
              className={`cursor-target mt-2 rounded-xl overflow-hidden grid gap-0.5 ${
                images.length === 1
                  ? 'grid-cols-1'
                  : images.length === 2
                    ? 'grid-cols-2'
                    : images.length === 3
                      ? 'grid-cols-2'
                      : 'grid-cols-2'
              }`}
            >
              {images.slice(0, 4).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => openImage(src)}
                  className={`relative block bg-foreground/5 overflow-hidden cursor-zoom-in ${
                    images.length === 3 && i === 0 ? 'row-span-2' : ''
                  }`}
                  style={{ aspectRatio: images.length === 1 ? '16/9' : '1/1' }}
                >
                  <Image
                    src={src}
                    alt={`Tweet image ${i + 1}`}
                    fill
                    className="object-cover hover:opacity-90 transition-opacity"
                    onError={() => handleImgError(src)}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}

          {/* Link card */}
          {hasCard && (
            <a
              href={tweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block rounded-xl overflow-hidden border border-foreground/10 hover:border-foreground/30 transition-colors"
            >
              <div
                className="relative w-full bg-foreground/5"
                style={{ aspectRatio: '2/1' }}
              >
                <Image
                  src={tweet.card!.thumbnailUrl!}
                  alt="link card"
                  fill
                  className="object-cover"
                  onError={() => handleImgError(tweet.card!.thumbnailUrl!)}
                  unoptimized
                />
              </div>
              {tweet.card?.title && (
                <div className="px-3 py-2 text-xs text-foreground/60 truncate">
                  {tweet.card.title}
                </div>
              )}
            </a>
          )}

          {/* Engagement row */}
          <div className="mt-2 flex items-center justify-between max-w-xs">
            <EngagementBtn
              label="replies"
              count={tweet.engagement.replies}
              icon={
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
                </svg>
              }
            />
            <EngagementBtn
              label="reposts"
              count={tweet.engagement.reposts}
              icon={
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                </svg>
              }
            />
            <EngagementBtn
              label="likes"
              count={tweet.engagement.likes}
              icon={
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
                </svg>
              }
            />
            <EngagementBtn
              label="views"
              count={tweet.engagement.views}
              icon={
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
                </svg>
              }
            />
          </div>

          {/* Open in X */}
          <a
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-primary-blue transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Xで開く
          </a>
        </div>
      </div>
    </article>
  )
}

// ── Virtualized list ──────────────────────────────────────────────────────────

const ITEM_ESTIMATE_HEIGHT = 200 // px fallback before measurement
const OVERSCAN = 2 // extra items above/below viewport

function VirtualTweetList({ tweets }: { tweets: Tweet[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Measured real heights per tweet index; start with estimates
  const heightsRef = useRef<number[]>(
    new Array(tweets.length).fill(ITEM_ESTIMATE_HEIGHT)
  )
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 15 })

  /** Cumulative top offsets: offsets[i] = sum of heights[0..i-1] */
  const getOffsets = useCallback(() => {
    const h = heightsRef.current
    const offsets = new Array(h.length + 1).fill(0)
    for (let i = 0; i < h.length; i++) offsets[i + 1] = offsets[i] + h[i]
    return offsets
  }, [])

  const computeRange = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, clientHeight } = el
    const offsets = getOffsets()
    const total = offsets[tweets.length]
    if (total === 0) return

    // Binary-search for first visible item
    let lo = 0,
      hi = tweets.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (offsets[mid + 1] < scrollTop) lo = mid + 1
      else hi = mid
    }
    const start = Math.max(0, lo - OVERSCAN)
    let end = lo
    while (end < tweets.length && offsets[end] < scrollTop + clientHeight) end++
    end = Math.min(tweets.length, end + OVERSCAN)

    setVisibleRange((prev) =>
      prev.start === start && prev.end === end ? prev : { start, end }
    )
  }, [tweets.length, getOffsets])

  // Scroll listener
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', computeRange, { passive: true })
    computeRange()
    return () => el.removeEventListener('scroll', computeRange)
  }, [computeRange])

  // Measure each rendered item with ResizeObserver
  const observerRef = useRef<ResizeObserver | null>(null)

  const measureRef = useCallback(
    (el: HTMLDivElement | null, index: number) => {
      if (!el) return
      if (!observerRef.current) {
        observerRef.current = new ResizeObserver((entries) => {
          let changed = false
          for (const entry of entries) {
            const idx = Number((entry.target as HTMLElement).dataset.vindex)
            const h =
              entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
            if (!isNaN(idx) && Math.abs(heightsRef.current[idx] - h) > 1) {
              heightsRef.current[idx] = h
              changed = true
            }
          }
          if (changed) computeRange()
        })
      }
      el.dataset.vindex = String(index)
      observerRef.current.observe(el)
    },
    [computeRange]
  )

  // Disconnect observer on unmount
  useEffect(() => () => observerRef.current?.disconnect(), [])

  const offsets = getOffsets()
  const totalHeight = offsets[tweets.length]
  const topSpacer = offsets[visibleRange.start]
  const bottomSpacer = totalHeight - offsets[visibleRange.end]

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto h-full"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* Top spacer */}
      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden />}

      {tweets
        .slice(visibleRange.start, visibleRange.end)
        .map((tweet, localIdx) => (
          <div
            key={tweet.id}
            ref={(el) => measureRef(el, visibleRange.start + localIdx)}
          >
            <TweetCard tweet={tweet} />
          </div>
        ))}

      {/* Bottom spacer */}
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden />}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TwitterSection() {
  const [data, setData] = useState<TweetsData | null>(null)
  const [error, setError] = useState(false)
  const [scrollUnlocked, setScrollUnlocked] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)

  // Close viewer on Escape
  useEffect(() => {
    if (!viewerSrc) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerSrc(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [viewerSrc])

  useEffect(() => {
    fetch('/tweets.json')
      .then((r) => r.json())
      .then((json: TweetsData | Tweet[]) => {
        // handle both shapes: { updatedAt, data } or plain array (legacy)
        if (Array.isArray(json)) {
          setData({ updatedAt: new Date().toISOString(), data: json })
        } else {
          setData(json)
        }
      })
      .catch(() => setError(true))
  }, [])

  const handle = data?.data[0]?.author?.handle ?? '@Piece_Music_'

  // ── Loading ──
  if (!data && !error) {
    return (
      <div className="w-full border border-foreground/10 bg-background/50 h-125 flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-sm opacity-40 animate-pulse">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Loading tweets...
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="w-full border border-foreground/10 bg-background/50 h-24 flex items-center justify-center">
        <span className="text-sm text-foreground/40 font-mono">
          Failed to load tweets.
        </span>
      </div>
    )
  }

  const tweets = data!.data.slice().sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0 // preserve existing order for non-pinned
  })

  return (
    <ImageViewerContext.Provider value={setViewerSrc}>
      <div className="w-full border border-foreground/10 bg-background/80 overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-mono text-sm font-bold">{handle}</span>
          </div>
          <a
            href={`https://x.com/${handle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-foreground/40 hover:text-primary-blue transition-colors font-mono"
          >
            プロフィールを開く →
          </a>
        </div>

        {/* Virtualized tweet list */}
        <div className="h-125 relative">
          <VirtualTweetList tweets={tweets} />

          {/* Mobile scroll-lock overlay — tap to unlock inner scroll */}
          {!scrollUnlocked && (
            <div
              className="md:hidden absolute inset-0 z-10 flex items-center justify-center cursor-pointer select-none"
              style={{ background: 'var(--background)', opacity: 0.85 }}
              onClick={() => setScrollUnlocked(true)}
            >
              <div className="flex flex-col items-center gap-2.5 text-foreground px-6 text-center">
                <span className="text-sm font-medium leading-snug">
                  タップしてポストをスクロール
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {data?.updatedAt && (
          <div className="px-4 py-2 border-t border-foreground/10 text-xs text-primary-orange/50 font-mono text-right">
            {new Date(data.updatedAt).toLocaleDateString('ja-JP')}現在のデータ
          </div>
        )}

        {/* ── Image viewer overlay ── */}
        {viewerSrc && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 cursor-zoom-out"
            onClick={() => setViewerSrc(null)}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close image"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors text-lg leading-none cursor-pointer"
              onClick={() => setViewerSrc(null)}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewerSrc}
              alt="Tweet image"
              className="max-w-full max-h-full object-contain rounded-lg select-none cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </ImageViewerContext.Provider>
  )
}
