'use client'

import PixelTransition from './reactbits/PixelTransition'
import ThemeAwareLogo from './ThemeAwareLogo'

type BrandLogoProps = {
  invert?: boolean
}

export default function BrandLogo({ invert = false }: BrandLogoProps) {
  return (
    <div className="cursor-target flex items-center gap-2">
      <PixelTransition gridSize={12}>
        <ThemeAwareLogo
          invert={invert}
          width={60}
          height={60}
          className="object-contain"
        />
      </PixelTransition>
    </div>
  )
}
