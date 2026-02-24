'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// components
import WorkCard, { Work } from './WorkCard'

interface WorksGridProps {
  works: Work[]
}

export default function WorksGrid({ works }: WorksGridProps) {
  const [filter, setFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [query, setQuery] = useState('')

  // Extract unique tags and sort them
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    works.forEach((work) => {
      if (work.tags && Array.isArray(work.tags)) {
        work.tags.forEach((tag) => tags.add(tag))
      }
    })
    return Array.from(tags).sort()
  }, [works])

  const filteredWorks = useMemo(() => {
    let result =
      filter === 'ALL'
        ? works
        : works.filter((work) => work.tags?.includes(filter))
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (work) =>
          work.title.toLowerCase().includes(q) ||
          work.description?.toLowerCase().includes(q) ||
          work.author?.toLowerCase().includes(q) ||
          work.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [works, filter, query])

  const displayedWorks = useMemo(() => {
    const list = [...filteredWorks]
    list.sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return list
  }, [filteredWorks, sortOrder])

  return (
    <div className="w-full">
      {/* Filter Bar */}
      <div className="mb-12 border-b border-foreground/20 pb-4">
        {/* Search Input */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-lg text-primary-blue mr-4 shrink-0">検索</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル、概要、作曲者、タグ..."
            className="w-full max-w-sm bg-transparent border border-foreground/30 px-3 py-1 text-sm font-mono placeholder:text-foreground/30 focus:outline-none focus:border-primary-blue transition-colors cursor-target"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs font-mono text-foreground/40 hover:text-foreground transition-colors cursor-target"
            >
              クリア
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
          <span className="text-lg text-primary-blue mr-4">タグ</span>
          <FilterButton
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
          >
            全部
          </FilterButton>
          {allTags.map((tag) => (
            <FilterButton
              key={tag}
              active={filter === tag}
              onClick={() => setFilter(tag)}
            >
              #{tag}
            </FilterButton>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 items-center justify-center md:justify-start">
          <span className="text-lg text-primary-blue mr-4">並び替え</span>
          <FilterButton
            active={sortOrder === 'newest'}
            onClick={() => setSortOrder('newest')}
          >
            新しい順
          </FilterButton>
          <FilterButton
            active={sortOrder === 'oldest'}
            onClick={() => setSortOrder('oldest')}
          >
            古い順
          </FilterButton>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {displayedWorks.map((work) => (
            <WorkCard key={work.slug} work={work} />
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredWorks.length === 0 && (
        <div className="text-center py-20 border border-dashed border-foreground/30 mt-8">
          <p className="font-mono text-foreground/50">
            作品がありません（エラーかも？）
          </p>
          {(filter !== 'ALL' || query) && (
            <button
              onClick={() => {
                setFilter('ALL')
                setQuery('')
              }}
              className="mt-4 text-xs font-mono text-primary-blue hover:underline cursor-target"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FilterButton({
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
        px-4 py-1 text-sm font-mono border transition-all duration-300 relative overflow-hidden group
        ${
          active
            ? 'border-primary-blue bg-primary-blue/10 text-primary-blue'
            : 'border-foreground/30 text-foreground/60 hover:border-foreground/80 hover:text-foreground'
        }
        cursor-target
      `}
    >
      {/* cursor-target so custom cursor recognizes this button */}
      {/* wraps the returned markup below with an extra class */}
      <span className="relative z-10">{children}</span>
      {active && (
        <motion.div
          layoutId="activeFilter"
          className="absolute inset-0 bg-primary-blue/5 z-0"
        />
      )}
    </button>
  )
}

// WorkCard has been extracted to its own module
