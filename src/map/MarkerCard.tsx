/** One of the visitor's own markers, edited in place: name, colour and note. */

import { useEffect, useRef, useState } from 'react'
import { MapPin, Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui'
import { cn } from '@/lib/utils'
import { IconBadge } from './IconBadge'
import { MARKER_COLORS, readableOn } from './pin-images'
import { deleteMarker, saveMarker, type MyMarker } from './user-data'

export const UNNAMED_MARKER = 'My marker'

const fieldClass =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function MarkerCard({ marker }: { marker: MyMarker }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const [isNew] = useState(marker.name === '')

  // A marker just placed is ready to be named. The map attaches this card to the page after it renders, hence the wait.
  useEffect(() => {
    if (!isNew) return
    const frame = requestAnimationFrame(() => nameInput.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [isNew])

  return (
    <article data-testid="marker-card" className="flex flex-col gap-3 text-left">
      <header className="flex items-center gap-3 pr-6">
        <IconBadge size="lg" color={marker.color} iconColor={readableOn(marker.color)}>
          <MapPin size={16} strokeWidth={2.25} />
        </IconBadge>
        <p className="text-xs font-medium text-muted-foreground">Your marker · only you see it</p>
      </header>

      <input
        data-testid="marker-name"
        value={marker.name}
        onChange={(event) => saveMarker({ ...marker, name: event.target.value })}
        maxLength={80}
        placeholder={UNNAMED_MARKER}
        aria-label="Marker name"
        ref={nameInput}
        className={cn(fieldClass, 'font-semibold')}
      />

      <div role="radiogroup" aria-label="Marker colour" className="flex items-center gap-2">
        {MARKER_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={marker.color === color}
            aria-label={`Colour ${color}`}
            onClick={() => saveMarker({ ...marker, color })}
            className={cn(
              'size-7 cursor-pointer rounded-full border-2 transition-transform hover:scale-110',
              marker.color === color ? 'border-white' : 'border-transparent',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <textarea
        data-testid="marker-note"
        value={marker.note}
        onChange={(event) => saveMarker({ ...marker, note: event.target.value })}
        maxLength={1000}
        rows={2}
        placeholder="Note (optional)"
        aria-label="Marker note"
        className={cn(fieldClass, 'resize-none')}
      />

      <footer className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
        <span className="text-xs text-muted-foreground">Saved as you type</span>
        <button
          type="button"
          data-testid="marker-delete"
          onClick={() => setConfirmingDelete(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </footer>

      <ConfirmModal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteMarker(marker.id)}
        title="Delete this marker?"
        description={`“${marker.name || UNNAMED_MARKER}” will be removed from your map.`}
        confirmText="Delete"
      />
    </article>
  )
}
