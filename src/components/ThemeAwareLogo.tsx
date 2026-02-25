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

  // Both images are always in the DOM; only one is visible at a time via CSS.
  // We expose one accessible label via the wrapper role="img" and suppress both
  // individual alt texts to avoid the screen reader announcing the logo twice.
  return (
    <span role="img" aria-label={alt} style={{ display: 'contents' }}>
      <Image
        src="/piecemusic_logo-light.png"
        alt=""
        aria-hidden
        {...props}
        className={`${props.className || ''} ${lightLogoClasses}`.trim()}
      />
      <Image
        src="/piecemusic_logo.png"
        alt=""
        aria-hidden
        {...props}
        className={`${props.className || ''} ${darkLogoClasses}`.trim()}
      />
    </span>
  )
}
