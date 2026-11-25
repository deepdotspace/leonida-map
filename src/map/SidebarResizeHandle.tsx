/**
 * The draggable inner edge of a side panel. Dragging it, or pressing the left
 * and right arrow keys while it has focus, changes the panel's width; a
 * double click puts the width back to the default. `onWidthChange` follows the
 * drag; `onWidthCommit` is called once with the width it ends on.
 */

import type { KeyboardEvent, PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export const DEFAULT_SIDEBAR_WIDTH = 320
const MIN_WIDTH = 260
const MAX_WIDTH = 560
const KEY_STEP = 16

export function clampSidebarWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))
}

interface SidebarResizeHandleProps {
  /** The edge of the window the panel sits on. */
  side: 'left' | 'right'
  defaultWidth: number
  label: string
  testId: string
  width: number
  onWidthChange: (width: number) => void
  onWidthCommit: (width: number) => void
}

export function SidebarResizeHandle({ side, defaultWidth, label, testId, width, onWidthChange, onWidthCommit }: SidebarResizeHandleProps) {
  const setWidth = (next: number) => {
    onWidthChange(next)
    onWidthCommit(next)
  }
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  /** The panel starts at an edge of the window, so the pointer's distance from that edge is the new width. */
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    onWidthChange(clampSidebarWidth(side === 'left' ? event.clientX : window.innerWidth - event.clientX))
  }
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const outward = side === 'left' ? 'ArrowLeft' : 'ArrowRight'
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') setWidth(clampSidebarWidth(width + (event.key === outward ? -KEY_STEP : KEY_STEP)))
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      title="Drag to resize"
      data-testid={testId}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onLostPointerCapture={() => onWidthCommit(width)}
      onDoubleClick={() => setWidth(defaultWidth)}
      onKeyDown={nudge}
      className={cn(
        'group absolute inset-y-0 z-30 hidden w-2 cursor-col-resize touch-none select-none outline-none',
        side === 'left' ? '-right-1 md:block' : '-left-1 lg:block',
      )}
    >
      <div className="mx-auto h-full w-0.5 bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100" />
    </div>
  )
}
