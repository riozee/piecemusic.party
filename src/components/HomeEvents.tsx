'use client'

import { useEffect, useState } from 'react'
import { Event } from '#site/content'
import Link from 'next/link'
import ScheduleCard from './ScheduleCard'

interface HomeEventsProps {
  events: Event[]
}

export default function HomeEvents({ events }: HomeEventsProps) {
  // We render this component on the client so the event list can update
  // based on the current time (e.g. when an event date passes after the
  // site was statically built).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const isUpcoming = (evtDate: string) => {
    try {
      return new Date(evtDate).getTime() >= now
    } catch {
      return false
    }
  }

  const upcomingEvents = events
    .filter((e) => isUpcoming(e.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const displayedEvents =
    upcomingEvents.length > 0
      ? upcomingEvents
      : events
          .filter((e) => !isUpcoming(e.date))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .slice(0, 1)

  return (
    <section className="py-2 relative w-full">
      <div className="flex flex-col gap-6 w-full">
        <ScheduleCard events={displayedEvents} />
        <div className="flex justify-end w-full">
          <Link
            href="/events"
            className="cursor-target text-xs font-mono opacity-70 hover:opacity-100 hover:text-primary-pink transition-colors flex items-center gap-1"
          >
            過去イベントを見る &gt;
          </Link>
        </div>
      </div>
    </section>
  )
}
