'use client'

import {
  useMemo,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from 'react'
import Image from 'next/image'
import * as runtime from 'react/jsx-runtime'

// Images in MDX should render normally without animation

const useMDXComponent = (code: string) => {
  return useMemo(() => {
    const fn = new Function(code)
    return fn({ ...runtime }).default
  }, [code])
}

interface MDXProps {
  code: string
  components?: Record<string, ComponentType>
}

const parseDimension = (value: unknown, fallback: number): number => {
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return fallback
}

const MarkdownImage = (props: ComponentPropsWithoutRef<'img'>) => {
  const { alt, width, height, className = '', src, ...rest } = props
  const resolvedWidth = parseDimension(width, 1200)
  const resolvedHeight = parseDimension(height, 675)
  const imageSrc = typeof src === 'string' ? src : undefined

  if (!imageSrc) {
    return null
  }

  // Render a plain Next.js Image component without any animation wrapper
  return (
    <Image
      alt={alt ?? ''}
      src={imageSrc}
      width={resolvedWidth}
      height={resolvedHeight}
      className={`block mx-auto h-auto w-full md:max-w-[60%]! ${className}`.trim()}
      loading="lazy"
      {...rest}
    />
  )
}

export function MDXContent({ code, components }: MDXProps) {
  const Component = useMDXComponent(code)
  return Component({
    components: {
      img: MarkdownImage,
      ...components,
    },
  })
}
