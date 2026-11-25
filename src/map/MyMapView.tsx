/**
 * "My map": the visitor's own things, opened from the sidebar's home list.
 * Their progress, their favourites, the places they wrote a note on and the
 * markers they dropped; a new marker is started here too.
 */

import type { ReactNode } from 'react'
import { Bookmark, MapPin, MapPinPlus } from 'lucide-react'
import { Switch } from '@/components/ui'
import { UNNAMED_MARKER } from './MarkerCard'
import { readableOn } from './pin-images'
import { pinById, pins, type Pin } from './pins'
import { PinRow, PlaceRow } from './PlaceRow'
import { SidebarView } from './SidebarView'
import type { MyMarker, UserData } from './user-data'

interface MyMapViewProps {
  userData: UserData
  hideFound: boolean
  onHideFoundChange: (hide: boolean) => void
  onResetProgress: () => void
  onGoToPin: (pin: Pin) => void
  onGoToMarker: (marker: MyMarker) => void
  onAddMarker: () => void
  onBack: () => void
}

function List({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null
  return (
    <div>
      <h3 className="px-2 pb-0.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {count}
      </h3>
      <ul>{children}</ul>
    </div>
  )
}

function savedPins(ids: Iterable<string>): Pin[] {
  return [...ids].flatMap((id) => pinById.get(id) ?? []).sort((a, b) => a.name.localeCompare(b.name))
}

/** What the visitor has saved, as the one line shown under "My map". */
export function myMapSummary({ found, favourites, notes, markers }: UserData): string {
  const saved = favourites.size + notes.size + markers.length
  const parts = [found.size > 0 && `${found.size.toLocaleString('en-US')} found`, saved > 0 && `${saved} saved`].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'Progress, favourites, notes, your markers'
}

export function MyMapView({ userData, hideFound, onHideFoundChange, onResetProgress, onGoToPin, onGoToMarker, onAddMarker, onBack }: MyMapViewProps) {
  const { found, favourites, notes, markers } = userData
  const foundTotal = found.size
  const nothingSaved = favourites.size + notes.size + markers.length === 0

  return (
    <SidebarView
      testId="my-map-view"
      icon={<Bookmark size={16} strokeWidth={2.25} />}
      color="var(--color-primary)"
      iconColor="var(--color-primary-foreground)"
      title="My map"
      subtitle={myMapSummary(userData)}
      onBack={onBack}
    >
      <div data-testid="progress" className="mx-2 mb-2 flex flex-col gap-2 rounded-lg bg-muted px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium tabular-nums text-foreground">
            Found {foundTotal.toLocaleString('en-US')} of {pins.length.toLocaleString('en-US')}
          </span>
          {foundTotal > 0 && (
            <button type="button" onClick={onResetProgress} className="cursor-pointer text-xs text-muted-foreground hover:text-foreground hover:underline">
              Reset
            </button>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-background">
          {foundTotal > 0 && <div className="h-full rounded-full bg-success" style={{ width: `${Math.max(1, (foundTotal / pins.length) * 100)}%` }} />}
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-muted-foreground">
          Hide found places on the map
          <Switch data-testid="hide-found" checked={hideFound} onCheckedChange={onHideFoundChange} />
        </label>
      </div>

      <button
        type="button"
        data-testid="add-marker"
        onClick={onAddMarker}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm font-medium text-primary hover:bg-accent/60"
      >
        <span className="flex size-6 items-center justify-center">
          <MapPinPlus size={16} />
        </span>
        Add your own marker
      </button>
      {nothingSaved && (
        <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">Star a place or write a note on it and it shows up here.</p>
      )}
      <List title="Favourites" count={favourites.size}>
        {savedPins(favourites).map((pin) => (
          <PinRow key={pin.id} pin={pin} onClick={() => onGoToPin(pin)} />
        ))}
      </List>
      <List title="Notes" count={notes.size}>
        {savedPins(notes.keys()).map((pin) => (
          <PinRow key={pin.id} pin={pin} subtitle={notes.get(pin.id)} onClick={() => onGoToPin(pin)} />
        ))}
      </List>
      <List title="My markers" count={markers.length}>
        {markers.map((marker) => (
          <PlaceRow
            key={marker.id}
            icon={<MapPin size={14} strokeWidth={2.25} />}
            color={marker.color}
            iconColor={readableOn(marker.color)}
            title={marker.name || UNNAMED_MARKER}
            subtitle={marker.note || 'Your marker'}
            onClick={() => onGoToMarker(marker)}
          />
        ))}
      </List>
    </SidebarView>
  )
}
