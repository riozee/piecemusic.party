'use client'

import Button from './Button'
import AboutSection from './AboutSection'

export default function HomeAboutSection() {
  return (
    <div className="relative mt-32">
      <AboutSection />
      <div className="absolute bottom-6 right-6 md:right-18 z-20">
        <Button href="/about" variant="outline">
          <span className="mr-2">サークル概要</span>
          <span className="opacity-60">&gt;</span>
        </Button>
      </div>
    </div>
  )
}
