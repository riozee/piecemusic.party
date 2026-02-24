'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PostCard from './PostCard'
import type { Post } from './PostCard'

// reuse the filter button style from works grid; kept internal here for
// simplicity so we don't have to export it from another module.
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

export type { Post }

interface PostsGridProps {
  posts: Post[]
}

export default function PostsGrid({ posts }: PostsGridProps) {
  const [filter, setFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [query, setQuery] = useState('')

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    posts.forEach((p) => {
      p.tags?.forEach((t) => tags.add(t))
    })
    return Array.from(tags).sort()
  }, [posts])

  const filteredPosts = useMemo(() => {
    let result =
      filter === 'ALL' ? posts : posts.filter((p) => p.tags?.includes(filter))
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [posts, filter, query])

  const displayedPosts = useMemo(() => {
    const list = [...filteredPosts]
    list.sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return list
  }, [filteredPosts, sortOrder])

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
            placeholder="タイトル、説明、タグ..."
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
        {/* Tags */}
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

      {/* List */}
      <motion.div layout className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {displayedPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-20 border border-dashed border-foreground/30 mt-8">
          <p className="font-mono text-foreground/50">no posts found</p>
          {(filter !== 'ALL' || query) && (
            <button
              onClick={() => {
                setFilter('ALL')
                setQuery('')
              }}
              className="mt-4 text-xs font-mono text-primary-blue hover:underline"
            >
              フィルター解除
            </button>
          )}
        </div>
      )}
    </div>
  )
}
