'use client'

import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import Link from 'next/link'
import Button from '@/components/Button'
import PasscodeGate from './PasscodeGate'
import type { AlbumData } from './types'

// Lazy-load the inner portal so crawlers never see the track list
const PortalInner = lazy(() => import('./PortalInner'))

interface AlbumPortalProps {
  data: AlbumData
}

/**
 * Top-level client component for an album download page.
 * Renders PasscodeGate first; once unlocked, lazy-loads and shows PortalInner.
 */
export default function AlbumPortal({ data }: AlbumPortalProps) {
  const [unlockedCode, setUnlockedCode] = useState<string | null>(null)

  const handleUnlock = useCallback((code: string) => {
    setUnlockedCode(code)
  }, [])

  return (
    <div className="container mx-auto max-w-6xl p-3 pt-12 mb-24">
      {/* Back button */}
      <div className="mb-8">
        <Link href="/download">
          <Button variant="outline" className="text-sm">
            &lt; ダウンロードへ戻る
          </Button>
        </Link>
      </div>

      {!unlockedCode ? (
        <PasscodeGate albumId={data.album.id} onUnlock={handleUnlock} />
      ) : (
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[40vh]">
              <p className="font-mono text-sm opacity-50 animate-pulse">
                Loading portal…
              </p>
            </div>
          }
        >
          <PortalInner data={data} code={unlockedCode} />
        </Suspense>
      )}
    </div>
  )
}
