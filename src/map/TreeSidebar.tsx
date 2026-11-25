/**
 * Tree Sidebar — a two-level tree of groups whose items switch on and off.
 * Groups start collapsed so the whole tree fits on one screen. An item's
 * checkbox toggles it, its name opens it, and a group's eye button toggles all
 * of its items at once.
 */

import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TreeNode {
  id: string
  title: string
  icon?: ReactNode
  /** Background of the icon badge while the node is on. */
  color?: string
  /** Colour of the icon inside the badge while the node is on. */
  iconColor?: string
  count?: number
  /** How many of `count` are done; shown as "3/22" when above zero. */
  done?: number
  children?: TreeNode[]
}

interface TreeSidebarProps {
  nodes: TreeNode[]
  /** Ids of the items (second-level nodes) that are switched on. */
  checkedIds: ReadonlySet<string>
  onCheckedChange: (itemIds: string[], checked: boolean) => void
  /** The visitor clicked an item's name to look inside it. */
  onOpenItem: (itemId: string) => void
  /** Open every group regardless of what the user collapsed, e.g. while searching. */
  expandAll?: boolean
  header?: ReactNode
  /** Rendered at the top of the scrolling area, above the tree. */
  children?: ReactNode
  className?: string
}

function IconBadge({ node, active, className }: { node: TreeNode; active: boolean; className: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors',
        !active && 'bg-muted text-muted-foreground',
        className,
      )}
      style={active ? { backgroundColor: node.color, color: node.iconColor } : undefined}
    >
      {node.icon}
    </span>
  )
}

interface TreeGroupProps {
  group: TreeNode
  checkedIds: ReadonlySet<string>
  onCheckedChange: (itemIds: string[], checked: boolean) => void
  onOpenItem: (itemId: string) => void
  expandAll: boolean
}

function TreeGroup({ group, checkedIds, onCheckedChange, onOpenItem, expandAll }: TreeGroupProps) {
  const [open, setOpen] = useState(false)
  const expanded = expandAll || open
  const items = group.children ?? []
  const itemIds = items.map((item) => item.id)
  const checkedCount = itemIds.filter((id) => checkedIds.has(id)).length
  const allChecked = checkedCount === itemIds.length
  const Chevron = expanded ? ChevronDown : ChevronRight
  const Visibility = checkedCount > 0 ? Eye : EyeOff
  const status = allChecked ? 'All shown' : checkedCount === 0 ? 'Hidden' : `${checkedCount} of ${itemIds.length} shown`

  return (
    <section data-testid={`tree-group-${group.id}`}>
      <div className="flex items-center gap-1 rounded-lg pr-1 hover:bg-accent/60">
        <button
          type="button"
          onClick={() => setOpen(!expanded)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left"
        >
          <IconBadge node={group} active={checkedCount > 0} className="size-8" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{group.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {group.count?.toLocaleString('en-US')} places · {status}
            </span>
          </span>
          <Chevron size={16} className="shrink-0 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={() => onCheckedChange(itemIds, !allChecked)}
          aria-label={allChecked ? `Hide all ${group.title}` : `Show all ${group.title}`}
          title={allChecked ? 'Hide all' : 'Show all'}
          className={cn(
            'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent',
            checkedCount > 0 ? 'text-foreground' : 'text-muted-foreground',
            checkedCount > 0 && !allChecked && 'opacity-60',
          )}
        >
          <Visibility size={16} />
        </button>
      </div>

      {expanded && (
        <ul className="mb-2 ml-6 mt-0.5 border-l border-border pl-1">
          {items.map((item) => {
            const checked = checkedIds.has(item.id)
            return (
              <li key={item.id} className="flex items-center rounded-md hover:bg-accent/60">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`Show ${item.title} on the map`}
                  title={checked ? 'Hide from the map' : 'Show on the map'}
                  onClick={() => onCheckedChange([item.id], !checked)}
                  data-testid={`tree-item-${item.id}`}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center"
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-[4px] border transition-colors',
                      checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60',
                    )}
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  data-testid={`tree-item-open-${item.id}`}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md py-1.5 pr-2 text-left"
                >
                  <IconBadge node={item} active={checked} className="size-6" />
                  <span className={cn('min-w-0 flex-1 truncate text-sm', checked ? 'text-foreground' : 'text-muted-foreground')}>
                    {item.title}
                  </span>
                  <span className={cn('shrink-0 text-xs tabular-nums', item.done ? 'font-medium text-success' : 'text-muted-foreground')}>
                    {item.done ? `${item.done}/${item.count}` : item.count}
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default function TreeSidebar({
  nodes, checkedIds, onCheckedChange, onOpenItem, expandAll = false, header, children, className,
}: TreeSidebarProps) {
  return (
    <div className={cn('flex h-full flex-col border-r border-border bg-card', className)}>
      {header}
      <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {children}
        {nodes.map((group) => (
          <TreeGroup
            key={group.id}
            group={group}
            checkedIds={checkedIds}
            onCheckedChange={onCheckedChange}
            onOpenItem={onOpenItem}
            expandAll={expandAll}
          />
        ))}
      </nav>
    </div>
  )
}
