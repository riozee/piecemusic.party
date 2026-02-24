import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  noHover?: boolean
}

export default function Card({
  children,
  className = '',
  noHover = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-card-bg border border-foreground/50 p-6 
        transition-all duration-300 ease-out
        ${!noHover ? 'hover:border-primary-blue hover:shadow-[0_0_10px_rgba(74,197,255,0.2)]' : ''}
        relative overflow-hidden
        ${className}
      `}
    >
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-foreground opacity-50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-foreground opacity-50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-foreground opacity-50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-foreground opacity-50" />
      {children}
    </div>
  )
}
