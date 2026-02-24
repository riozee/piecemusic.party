'use client'

import { useState } from 'react'
import Button from './Button'
import Toast from './Toast'

interface ShareButtonProps {
  title: string
  url?: string
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false)

  const handleShare = () => {
    const shareUrl = url || window.location.href

    if (navigator.share) {
      navigator
        .share({
          title: title,
          url: shareUrl,
        })
        .catch((error) => console.error('Error sharing:', error))
    } else {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => setShowToast(true))
        .catch((error) => console.error('Error copying to clipboard:', error))
    }
  }

  return (
    <>
      <Button
        variant="warning"
        onClick={handleShare}
        className="text-sm"
      >
        リンクをコピー
      </Button>

      <Toast
        message="コピー済み！"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}
