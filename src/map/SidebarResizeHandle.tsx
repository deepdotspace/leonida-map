/**
 * The draggable right edge of the sidebar. Dragging it, or pressing the left
 * and right arrow keys while it has focus, changes the sidebar's width; a
 * double click puts the width back to the default. `onWidthChange` follows the
 * drag; `onWidthCommit` is called once with the width it ends on.
 */

import type { KeyboardEvent, PointerEvent } from 'react'

export const DEFAULT_SIDEBAR_WIDTH = 320
const MIN_WIDTH = 260
const MAX_WIDTH = 560
const KEY_STEP = 16

export function clampSidebarWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))
}

interface SidebarResizeHandleProps {
  width: number
  onWidthChange: (width: number) => void
  onWidthCommit: (width: number) => void
}

export function SidebarResizeHandle({ width, onWidthChange, onWidthCommit }: SidebarResizeHandleProps) {
  const setWidth = (next: number) => {
    onWidthChange(next)
    onWidthCommit(next)
  }
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  /** The sidebar starts at the window's left edge, so the pointer's x is the new width. */
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) onWidthChange(clampSidebarWidth(event.clientX))
  }
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') setWidth(clampSidebarWidth(width - KEY_STEP))
    if (event.key === 'ArrowRight') setWidth(clampSidebarWidth(width + KEY_STEP))
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      title="Drag to resize"
      data-testid="sidebar-resize"
      onPointerDown={startDrag}
      onPointerMove={drag}
      onLostPointerCapture={() => onWidthCommit(width)}
      onDoubleClick={() => setWidth(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={nudge}
      className="group absolute inset-y-0 -right-1 z-30 hidden w-2 cursor-col-resize touch-none select-none outline-none md:block"
    >
      <div className="mx-auto h-full w-0.5 bg-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100" />
    </div>
  )
}
