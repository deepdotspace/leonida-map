/**
 * A page inside the sidebar that covers the home list: a back arrow, what the
 * page is about, and a scrolling body. Every row on the home list that opens
 * (a category, Must see, Places with reels, My map) opens as one of these.
 */

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { IconBadge } from './IconBadge'

interface SidebarViewProps {
  testId: string
  icon: ReactNode
  color: string
  iconColor: string
  title: string
  subtitle: string
  onBack: () => void
  /** A control at the end of the title row. */
  action?: ReactNode
  /** Fixed below the title row, above the scrolling body. */
  toolbar?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function SidebarView({ testId, icon, color, iconColor, title, subtitle, onBack, action, toolbar, footer, children }: SidebarViewProps) {
  return (
    <div data-testid={testId} className="absolute inset-0 z-10 flex flex-col border-r border-border bg-card">
      <header className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="sidebar-back"
            onClick={onBack}
            aria-label="Back"
            title="Back"
            autoFocus
            className="-ml-2 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <IconBadge size="lg" color={color} iconColor={iconColor}>
            {icon}
          </IconBadge>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold leading-tight text-foreground">{title}</h2>
            <p className="truncate text-xs tabular-nums text-muted-foreground">{subtitle}</p>
          </div>
          {action}
        </div>
        {toolbar}
      </header>
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">{children}</div>
      {footer}
    </div>
  )
}
