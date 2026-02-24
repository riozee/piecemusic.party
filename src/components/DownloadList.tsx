'use client'

import {
  useState,
  useMemo,
  useEffect,
  Suspense,
  useCallback,
  startTransition,
} from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import AccessCardModal from './AccessCardModal'

export interface DownloadGroup {
  id: string // path segment of the download URL, e.g. "piece_1_20251121"
  downloadUrl: string
  title: string // combined work titles
  covers: string[] // cover image paths
  latestDate: string // for sorting
}

// ---------------------------------------------------------------------------
// Collage – renders 1–4 cover images in a grid
// ---------------------------------------------------------------------------
function WorksCollage({ covers }: { covers: string[] }) {
  if (covers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white font-mono text-xl">
        ¯\_(ツ)_/¯
      </div>
    )
  }

  if (covers.length === 1) {
    return (
      <Image
        src={covers[0]}
        alt=""
        fill
        sizes="(max-width: 768px) 50vw, 20vw"
        className="object-cover"
      />
    )
  }

  if (covers.length === 2) {
    return (
      <div className="grid grid-cols-2 w-full h-full">
        {covers.map((c, i) => (
          <div key={i} className="relative w-full h-full">
            <Image
              src={c}
              alt=""
              fill
              sizes="(max-width: 768px) 25vw, 10vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  if (covers.length === 3) {
    // Left half: first, Right half: two stacked
    return (
      <div className="flex w-full h-full">
        <div className="relative w-1/2 h-full">
          <Image
            src={covers[0]}
            alt=""
            fill
            sizes="(max-width: 768px) 25vw, 10vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col w-1/2 h-full">
          {covers.slice(1).map((c, i) => (
            <div key={i} className="relative w-full flex-1">
              <Image
                src={c}
                alt=""
                fill
                sizes="(max-width: 768px) 25vw, 10vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 4+: 2×2 grid
  return (
    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
      {covers.slice(0, 4).map((c, i) => (
        <div key={i} className="relative w-full h-full">
          <Image
            src={c}
            alt=""
            fill
            sizes="(max-width: 768px) 25vw, 10vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort button (mirrors WorksGrid / PostsGrid style)
// ---------------------------------------------------------------------------
function SortButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1 text-sm font-mono border transition-all duration-300 relative overflow-hidden
        ${
          active
            ? 'border-primary-blue bg-primary-blue/10 text-primary-blue'
            : 'border-foreground/30 text-foreground/60 hover:border-foreground/80 hover:text-foreground'
        }
        cursor-target
      `}
    >
      <span className="relative z-10">{children}</span>
      {active && (
        <motion.div
          layoutId="activeSortDownload"
          className="absolute inset-0 bg-primary-blue/5 z-0"
        />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Single download group card
// ---------------------------------------------------------------------------
function DownloadCard({
  group,
  onOpen,
}: {
  group: DownloadGroup
  onOpen: (group: DownloadGroup) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="cursor-target flex gap-4 md:gap-6 border border-foreground/20 bg-card-bg/60 backdrop-blur-sm hover:border-foreground/60 transition-colors group cursor-pointer"
      onClick={() => onOpen(group)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(group)
      }}
    >
      {/* Collage */}
      <div className="relative shrink-0 w-32 md:w-44 aspect-square border-r border-foreground/20 overflow-hidden bg-black">
        <WorksCollage covers={group.covers} />
        {/* Subtle overlay on hover */}
        <div className="absolute inset-0 bg-primary-blue/0 group-hover:bg-primary-blue/10 transition-colors" />
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center py-4 pr-4 gap-2 min-w-0">
        <p className="text-xs font-mono opacity-40 tracking-widest uppercase">
          download / access card
        </p>
        <h2 className="font-mono font-bold text-lg md:text-xl leading-tight wrap-break-word">
          {group.title}
        </h2>
        <p className="text-xs font-mono opacity-50 break-all">
          {group.downloadUrl}
        </p>
        <div className="mt-2">
          <span className="inline-block text-xs font-mono px-3 py-1 border border-primary-orange text-primary-orange group-hover:bg-primary-orange group-hover:text-background transition-colors">
            ダウンロード &gt;
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Inner component – uses useSearchParams (needs Suspense boundary)
// ---------------------------------------------------------------------------
function DownloadListContent({ groups }: { groups: DownloadGroup[] }) {
  const searchParams = useSearchParams()
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [activeGroup, setActiveGroup] = useState<DownloadGroup | null>(null)

  const handleOpen = useCallback(
    (group: DownloadGroup) => setActiveGroup(group),
    []
  )

  // Auto-open modal when ?id= is present in the URL
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id) return
    const match = groups.find((g) => g.id === id)
    if (match) startTransition(() => setActiveGroup(match))
  }, [searchParams, groups])

  const sorted = useMemo(() => {
    return [...groups].sort((a, b) => {
      const ta = new Date(a.latestDate).getTime()
      const tb = new Date(b.latestDate).getTime()
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
  }, [groups, sortOrder])

  return (
    <>
      {/* Sort bar */}
      <div className="mb-8 border-b border-foreground/20 pb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-lg text-primary-blue font-mono mr-4">
            並び替え
          </span>
          <SortButton
            active={sortOrder === 'newest'}
            onClick={() => setSortOrder('newest')}
          >
            新しい順
          </SortButton>
          <SortButton
            active={sortOrder === 'oldest'}
            onClick={() => setSortOrder('oldest')}
          >
            古い順
          </SortButton>
        </div>
      </div>

      {/* List */}
      <motion.div layout className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {sorted.map((group) => (
            <DownloadCard key={group.id} group={group} onOpen={handleOpen} />
          ))}
        </AnimatePresence>
      </motion.div>

      {sorted.length === 0 && (
        <div className="text-center py-20 border border-dashed border-foreground/30 mt-8">
          <p className="font-mono text-foreground/50">no downloads found</p>
        </div>
      )}

      {/* Modal */}
      {activeGroup && (
        <AccessCardModal
          downloadUrl={activeGroup.downloadUrl}
          isOpen={true}
          onClose={() => setActiveGroup(null)}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Public export – wraps inner in Suspense for useSearchParams
// ---------------------------------------------------------------------------
export default function DownloadList({ groups }: { groups: DownloadGroup[] }) {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-foreground/40 py-8">loading...</div>
      }
    >
      <DownloadListContent groups={groups} />
    </Suspense>
  )
}
