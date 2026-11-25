import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const SIZE = { sm: 'size-6', md: 'size-7', lg: 'size-8' }

interface IconBadgeProps {
  size: keyof typeof SIZE
  color: string
  iconColor: string
  className?: string
  children: ReactNode
}

/** The round coloured badge an icon sits in, wherever a category, collection or marker is named. */
export function IconBadge({ size, color, iconColor, className, children }: IconBadgeProps) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full', SIZE[size], className)} style={{ backgroundColor: color, color: iconColor }}>
      {children}
    </span>
  )
}
