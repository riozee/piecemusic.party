'use client'

import { useState } from 'react'
import Button from './Button'
import AccessCardModal from './AccessCardModal'

interface AccessCardDownloadButtonProps {
  downloadUrl: string
}

export default function AccessCardDownloadButton({
  downloadUrl,
}: AccessCardDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="warning" onClick={() => setIsOpen(true)}>
        <span className="relative z-10">ダウンロード &gt;</span>
      </Button>
      <AccessCardModal
        downloadUrl={downloadUrl}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
