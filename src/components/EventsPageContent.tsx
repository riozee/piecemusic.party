'use client'

import { useEffect, useState } from 'react'
import ScheduleCard from './ScheduleCard'
import Link from 'next/link'
import Button from './Button'
import { Event } from '#site/content'

interface EventsPageContentProps {
  events: Event[]
}

export default function EventsPageContent({ events }: EventsPageContentProps) {
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

  const pastEvents = events
    .filter((e) => !isUpcoming(e.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 pb-32 md:pb-8 space-y-20 relative">
      <div className="mt-4 mb-8">
        <Link href="/">
          <Button variant="outline" className="text-sm">
            &lt; ホームへ戻る
          </Button>
        </Link>
      </div>
      <section className="relative">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-4 h-4 bg-primary-orange animate-pulse" />
          <h1 className="text-4xl font-bold font-mono tracking-tighter">
            開催予定のイベント
          </h1>
        </div>

        <div className="grid gap-12 relative">
          {upcomingEvents.length > 0 ? (
            <ScheduleCard events={upcomingEvents} />
          ) : (
            <div className="border border-dashed border-foreground/30 p-8 text-center font-mono opacity-50 ml-8">
              イベントはありません
            </div>
          )}
        </div>
      </section>

      <section className="relative">
        <div className="flex items-center gap-4 mb-12 opacity-50">
          <div className="w-4 h-4 bg-foreground" />
          <h2 className="text-3xl font-bold font-mono tracking-tighter">
            過去のイベント
          </h2>
        </div>

        <div className="grid gap-12 relative transition-opacity duration-500">
          {pastEvents.length > 0 ? (
            <ScheduleCard events={pastEvents} />
          ) : (
            <div className="border border-dashed border-foreground/30 p-8 text-center font-mono opacity-50 ml-8">
              過去のイベントはありません
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
