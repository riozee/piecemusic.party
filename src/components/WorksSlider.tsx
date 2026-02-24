'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Button from './Button'
import { LucideChevronLeft, LucideChevronRight } from 'lucide-react'
import WorkCard, { Work } from './WorkCard'

interface WorksSliderProps {
  works: Work[]
}

export default function WorksSlider({ works }: WorksSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleScroll = useCallback((direction: 'next' | 'prev') => {
    if (!scrollRef.current) return
    const container = scrollRef.current
    const items = Array.from(container.children) as HTMLElement[]
    if (items.length === 0) return

    const maxScrollLeft = Math.max(
      0,
      container.scrollWidth - container.clientWidth
    )
    const EDGE_EPSILON = 8 // px tolerance for sub-pixel / rounding differences

    // Early wrap checks
    if (
      direction === 'next' &&
      container.scrollLeft >= maxScrollLeft - EDGE_EPSILON
    ) {
      container.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    if (direction === 'prev' && container.scrollLeft <= EDGE_EPSILON) {
      container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' })
      return
    }

    const padding = 16 // 1rem from scrollPaddingInline
    const currentScroll = container.scrollLeft + padding

    // Find the item currently at the start
    let activeItem = items[0]
    let minDistance = Infinity
    items.forEach((item) => {
      const distance = Math.abs(item.offsetLeft - currentScroll)
      if (distance < minDistance) {
        minDistance = distance
        activeItem = item
      }
    })

    let targetItem: HTMLElement | undefined

    if (direction === 'next') {
      targetItem = items.find(
        (item) => item.offsetLeft > activeItem.offsetLeft + 12
      )
    } else {
      targetItem = [...items]
        .reverse()
        .find((item) => item.offsetLeft < activeItem.offsetLeft - 12)
    }

    if (targetItem) {
      const targetScroll = targetItem.offsetLeft - padding
      container.scrollTo({
        left: Math.min(maxScrollLeft, Math.max(0, targetScroll)),
        behavior: 'smooth',
      })
    } else {
      // Fallback if no target item found
      if (direction === 'next') {
        if (container.scrollLeft < maxScrollLeft - EDGE_EPSILON) {
          container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' })
        } else {
          container.scrollTo({ left: 0, behavior: 'smooth' })
        }
      } else {
        if (container.scrollLeft > EDGE_EPSILON) {
          container.scrollTo({ left: 0, behavior: 'smooth' })
        } else {
          container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' })
        }
      }
    }
  }, [])

  const handleNext = useCallback(() => handleScroll('next'), [handleScroll])
  const handlePrev = useCallback(() => handleScroll('prev'), [handleScroll])
  // generic pause helper used by buttons or other interactions
  const pauseSlider = useCallback((duration = 3000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsPaused(true)
    timeoutRef.current = setTimeout(() => {
      setIsPaused(false)
    }, duration)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      handleNext()
    }, 2000)

    return () => clearInterval(interval)
  }, [handleNext, isPaused])

  // touch handling for horizontal pause
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      touchStartX.current = t.clientX
      touchStartY.current = t.clientY
      // do not pause yet; wait for move to determine direction
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      const dx = Math.abs(t.clientX - touchStartX.current)
      const dy = Math.abs(t.clientY - touchStartY.current)
      // if horizontal movement dominates, pause the slider
      if (dx > dy && dx > 5) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsPaused(true)
      }
    }

    const onTouchEnd = () => {
      // resume after a short delay regardless of direction
      timeoutRef.current = setTimeout(() => {
        setIsPaused(false)
      }, 1000)
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: true })
    container.addEventListener('touchend', onTouchEnd)

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div className="w-full relative py-8 group/slider">
      <div className="relative">
        <div
          ref={scrollRef}
          // smaller horizontal gap on mobile improves perceived density without
          // changing card widths. we keep gap-6 at md+ to match the desktop
          // layout and maintain scroll/snap math consistency (offsetLeft
          // calculations already account for the gap automatically).
          className="grid grid-rows-1 grid-flow-col gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-6 px-4 md:px-8"
          style={{ scrollPaddingInline: '1rem', scrollbarWidth: 'none' }}
        >
          {works.map((work, index) => (
            <div
              key={`${work.slug}-${index}`}
              className="cursor-target w-[75vw] sm:w-[60vw] md:w-[60vw] md:min-w-150 shrink-0 flex flex-col snap-start p-2"
            >
              {/* wrapper gives slider sizing and padding; WorkCard handles card styling */}
              <WorkCard work={work} />
            </div>
          ))}
        </div>

        <div className="absolute top-1/2 left-0 transform -translate-y-[calc(50%+0.75rem)] z-20 pointer-events-none w-full flex justify-between px-2 md:px-4 opacity-0 group-hover/slider:opacity-100 transition-all duration-300">
          <button
            onMouseEnter={() => pauseSlider(3000)}
            onClick={() => {
              pauseSlider(3000)
              handlePrev()
            }}
            className="cursor-target rounded-lg bg-background border border-foreground p-3 hover:bg-foreground hover:text-background transition-colors pointer-events-auto group shadow-lg"
            aria-label="Previous work"
          >
            <LucideChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <button
            onMouseEnter={() => pauseSlider(3000)}
            onClick={() => {
              pauseSlider(3000)
              handleNext()
            }}
            className="cursor-target rounded-lg bg-background border border-foreground p-3 hover:bg-foreground hover:text-background transition-colors pointer-events-auto group shadow-lg"
            aria-label="Next work"
          >
            <LucideChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <Button href="/works" variant="outline">
          すべての作品を見る
        </Button>
      </div>
    </div>
  )
}
