import React from 'react'
import Link from 'next/link'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  href?: string
  target?: string
  rel?: string
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  href,
  ...props
}: ButtonProps) {
  const baseStyles =
    'cursor-target inline-flex items-center justify-center font-mono font-bold uppercase transition-all duration-200 relative overflow-hidden group cursor-pointer text-sm tracking-widest hover:rounded-lg'

  const variants = {
    primary:
      'bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground hover:border-primary-blue',
    secondary:
      'bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background hover:border-primary-blue',
    outline:
      'bg-transparent text-foreground border border-foreground hover:bg-foreground hover:text-background hover:border-primary-blue',
    ghost:
      'bg-transparent text-foreground hover:bg-foreground/5 hover:text-primary-blue',
    warning:
      'bg-primary-orange text-background border border-foreground hover:bg-foreground hover:text-background',
  }

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-base',
  }

  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

  if (href) {
    // Check if external link
    const isExternal = href.startsWith('http')

    if (isExternal) {
      return (
        <a
          href={href}
          className={`${combinedClassName} no-underline`}
          target="_blank"
          rel="noopener noreferrer"
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          <span className="relative z-10 flex items-center gap-2">
            {children}
          </span>
        </a>
      )
    }

    return (
      <Link
        href={href}
        className={`${combinedClassName} no-underline`}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </Link>
    )
  }

  return (
    <button className={combinedClassName} {...props}>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}
