'use client'

import React, { useState } from 'react'
import AutoFitText from './AutoFitText'

export default function AboutSection() {
  const [textHeight, setTextHeight] = useState(0)

  return (
    <section className="relative">
      <div className="container mx-auto md:px-12 relative">
        <div className="bg-card-bg border border-foreground/30 p-8 md:p-12 pb-16 md:pb-16 relative overflow-hidden backdrop-blur-sm shadow-xl">
          <div
            aria-hidden="true"
            className="absolute -bottom-5 right-0 opacity-10 text-9xl font-mono tracking-tighter z-10 pointer-events-none select-none"
          >
            ABOUT
          </div>

          <AutoFitText
            className="absolute top-2 left-4 md:left-8 right-4 md:right-8 leading-relaxed font-bold text-foreground z-20 text-right"
            minFontSize={12}
            maxFontSize={96}
            onHeightChange={setTextHeight}
          >
            音楽って音でできるんですね
          </AutoFitText>

          <div className="relative z-10">
            <div
              className="space-y-6"
              style={{
                paddingTop: textHeight ? `${textHeight + 8}px` : '6rem',
              }}
            >
              <p className="text-lg text-foreground/80">...</p>
              <p className="text-lg text-foreground/80">...</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
