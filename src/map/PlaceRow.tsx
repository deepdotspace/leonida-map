import type { ReactNode } from 'react'
import { categoryIcon } from './category-icons'
import { IconBadge } from './IconBadge'
import { readableOn } from './pin-images'
import { categoryById, type Pin } from './pins'

interface PlaceRowProps {
  icon: ReactNode
  color: string
  iconColor: string
  title: string
  subtitle: string
  /** Shown at the end of the row, e.g. a reel's play count. */
  trailing?: ReactNode
  onClick: () => void
}

/** One place in a sidebar list (search results, favourites, notes, own markers); clicking opens it on the map. */
export function PlaceRow({ icon, color, iconColor, title, subtitle, trailing, onClick }: PlaceRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/60"
      >
        <IconBadge size="sm" color={color} iconColor={iconColor}>
          {icon}
        </IconBadge>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        {trailing}
      </button>
    </li>
  )
}

export function PinRow({ pin, subtitle, trailing, onClick }: { pin: Pin; subtitle?: string; trailing?: ReactNode; onClick: () => void }) {
  const category = categoryById.get(pin.category)!
  const Icon = categoryIcon(category)
  return (
    <PlaceRow
      icon={<Icon size={14} strokeWidth={2.25} />}
      color={category.color}
      iconColor={readableOn(category.color)}
      title={pin.name}
      subtitle={subtitle ?? category.name}
      trailing={trailing}
      onClick={onClick}
    />
  )
}
