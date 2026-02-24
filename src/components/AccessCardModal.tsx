'use client'

import { useEffect, useRef } from 'react'
import Button from './Button'

interface AccessCardModalProps {
  downloadUrl: string
  isOpen: boolean
  onClose: () => void
}

export default function AccessCardModal({
  downloadUrl,
  isOpen,
  onClose,
}: AccessCardModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-[90%] h-[80%] overflow-auto md:h-auto md:w-full md:max-w-lg border-2 font-bold border-foreground bg-background shadow-[8px_8px_0px_var(--primary-blue)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-foreground px-6 py-4">
          <span className="text-xs tracking-widest uppercase opacity-50">
            external / access card
          </span>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground transition-colors text-xl leading-none cursor-pointer"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* External site warning */}
          <div className="border border-primary-orange/60 bg-primary-orange/10 px-4 py-3 text-sm">
            <p className="font-bold text-primary-orange tracking-wide mb-1">
              外部サイトへのリンク
            </p>
            <p className="opacity-80 text-xs break-all">{downloadUrl}</p>
          </div>

          {/* 利用方法 */}
          <section>
            <h2 className="text-sm font-bold tracking-widest uppercase border-b border-foreground/30 pb-1 mb-3">
              利用方法
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm opacity-80">
              <li>
                下記の「サイトに移動」ボタンをクリック、ブラウザでリンクを入力、またはQRコードを読み込んで専用サイトにアクセス
              </li>
              <li>ユーザー名、パスワードを正しく入力してください</li>
              <li>アクセスできたサイト内にコンテンツがあります。</li>
            </ol>
          </section>

          {/* 注意事項 */}
          <section>
            <h2 className="text-sm font-bold tracking-widest uppercase border-b border-foreground/30 pb-1 mb-3">
              注意事項
            </h2>
            <ul className="space-y-2 text-xs opacity-70">
              <li className="flex gap-2">
                <span className="shrink-0">・</span>
                <span>有効期限は予告なく変更になる可能性があります。</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">・</span>
                <span>
                  カード裏面に記載されているユーザー名とパスワードをインターネット上へ絶対に公開しないでください。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">・</span>
                <span>
                  サイトアクセスによるトラブルは、当サークルでは一切の責任を負いません。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">・</span>
                <span>
                  最新情報は公式X（
                  <a
                    href="https://x.com/Piece_Music_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary-blue"
                  >
                    @Piece_Music_
                  </a>
                  ）にてご確認ください。
                </span>
              </li>
            </ul>
          </section>

          {/* アクセスカードを持っていることを前提 */}
          <p className="text-xs opacity-50 border-t border-foreground/20 pt-4">
            ※
            アクセスカードをお持ちの方のみご利用いただけます。ユーザー名・パスワードはカード裏面をご確認ください。
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button href={downloadUrl} variant="warning" className="flex-1">
              サイトに移動 &gt;
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              キャンセル
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
