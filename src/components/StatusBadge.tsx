'use client'

import { useEffect, useState } from 'react'

interface StatusBadgeProps {
  date: string
}

export default function StatusBadge({ date }: StatusBadgeProps) {
  // track current time to allow countdown to update dynamically
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const eventTime = new Date(date).getTime()
  const isUpcoming = eventTime >= now
  const diffDays = isUpcoming
    ? Math.ceil((eventTime - now) / (1000 * 60 * 60 * 24))
    : null

  return (
    <>
      <span
        className={`px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider ${
          isUpcoming
            ? 'bg-primary-blue text-black animate-pulse'
            : 'bg-foreground/50 text-background'
        }`}
      >
        {isUpcoming ? '● 開催予定' : '■ 過去'}
      </span>
      {isUpcoming && diffDays !== null && diffDays >= 0 && diffDays < 15 && (
        <span className="ml-2 px-2 py-0.5 text-xs font-mono tracking-tighter bg-primary-orange text-black">
          あと{diffDays}日
        </span>
      )}
    </>
  )
}
