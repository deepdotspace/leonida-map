/**
 * The places of one category or collection, listed inside the sidebar. A row
 * shows whether the place has a reel (with its play count) and whether the
 * visitor has found it; clicking a row opens the place on the map.
 */

import { useState, type ReactNode } from 'react'
import { Check, Clapperboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchInput } from '@/components/ui'
import { parseDescription, type Pin } from './pins'
import { PinRow } from './PlaceRow'
import { formatPlays, topPlaysByPin } from './reels'
import { SidebarView } from './SidebarView'

interface PlaceListProps {
  icon: ReactNode
  color: string
  iconColor: string
  title: string
  pins: Pin[]
  found: ReadonlySet<string>
  /** Describe each place by its own text (inside a category) or by its category (in a mixed list). */
  describeBy: 'description' | 'category'
  /** Whether the map currently shows these places and nothing else. */
  onlyThese: boolean
  onOnlyTheseChange: (only: boolean) => void
  onBack: () => void
  onGoToPin: (pin: Pin) => void
  action?: ReactNode
  footer?: ReactNode
}

export function PlaceList({
  icon, color, iconColor, title, pins, found, describeBy, onlyThese, onOnlyTheseChange, onBack, onGoToPin, action, footer,
}: PlaceListProps) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = needle ? pins.filter((pin) => pin.name.toLowerCase().includes(needle)) : pins
  const foundHere = pins.reduce((total, pin) => total + (found.has(pin.id) ? 1 : 0), 0)
  const withReels = pins.reduce((total, pin) => total + (topPlaysByPin.has(pin.id) ? 1 : 0), 0)
  const facts = [
    `${pins.length.toLocaleString('en-US')} ${pins.length === 1 ? 'place' : 'places'}`,
    foundHere > 0 && `${foundHere} found`,
    withReels > 0 && withReels < pins.length && `${withReels} with reels`,
  ].filter(Boolean)

  return (
    <SidebarView
      testId="place-list"
      icon={icon}
      color={color}
      iconColor={iconColor}
      title={title}
      subtitle={facts.join(' · ')}
      onBack={onBack}
      action={action}
      footer={footer}
      toolbar={
        <>
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            placeholder={`Search these ${pins.length.toLocaleString('en-US')}`}
            aria-label={`Search ${title}`}
          />
          <button
            type="button"
            data-testid="only-these"
            aria-pressed={onlyThese}
            onClick={() => onOnlyTheseChange(!onlyThese)}
            className={cn(
              'flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors',
              onlyThese ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border text-foreground hover:bg-accent',
            )}
          >
            {onlyThese && <Check size={16} />}
            {onlyThese ? 'Showing only these on the map' : 'Show only these on the map'}
          </button>
        </>
      }
    >
      {shown.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing matches “{query.trim()}”.</p>}
      <ul>
        {shown.map((pin) => {
          const plays = topPlaysByPin.get(pin.id)
          return (
            <PinRow
              key={pin.id}
              pin={pin}
              subtitle={describeBy === 'description' ? parseDescription(pin.description).prose || undefined : undefined}
              trailing={
                (plays !== undefined || found.has(pin.id)) && (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                    {plays !== undefined && (
                      <span className="flex items-center gap-1" title="Has a reel">
                        <Clapperboard size={12} />
                        {formatPlays(plays)}
                      </span>
                    )}
                    {found.has(pin.id) && <Check size={14} strokeWidth={3} className="text-success" aria-label="Found" />}
                  </span>
                )
              }
              onClick={() => onGoToPin(pin)}
            />
          )
        })}
      </ul>
    </SidebarView>
  )
}
