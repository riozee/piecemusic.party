'use client'

import Image, { ImageProps } from 'next/image'

type ThemeAwareLogoProps = Omit<ImageProps, 'src' | 'alt'> & {
  alt?: string
  invert?: boolean
}

export default function ThemeAwareLogo({
  alt = 'Piece Music Logo',
  invert = false,
  ...props
}: ThemeAwareLogoProps) {
  const lightLogoClasses = invert ? 'block dark:hidden' : 'hidden dark:block'
  const darkLogoClasses = invert ? 'hidden dark:block' : 'block dark:hidden'

  return (
    <>
      <Image
        src="/piecemusic_logo-light.png"
        alt={alt}
        {...props}
        className={`${props.className || ''} ${lightLogoClasses}`.trim()}
      />
      <Image
        src="/piecemusic_logo.png"
        alt={alt}
        {...props}
        className={`${props.className || ''} ${darkLogoClasses}`.trim()}
      />
    </>
  )
}
