/**
 * The map's left sidebar. Its home list has search, the Must see list, the
 * places with reels, Instagram Finds, the visitor's own things ("My map") and the tree of
 * groups and categories. A category's checkbox shows or hides its pins; its
 * name, like every other row, opens a page listing what is inside.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bookmark, ChevronRight, Clapperboard, Eye, EyeOff, Flame, PanelLeftClose, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfirmModal, SearchInput } from '@/components/ui'
import { categoryIcon, groupIcon } from './category-icons'
import { collectionById, mustSee, withReels, type CollectionId } from './collections'
import { focusName, type Focus } from './filter'
import { IconBadge } from './IconBadge'
import { MyMapView, myMapSummary } from './MyMapView'
import { readableOn } from './pin-images'
import { categories, categoryById, groups, pinCountByCategory, pins, pinsByCategory, type Pin } from './pins'
import { PlaceList } from './PlaceList'
import { PinRow } from './PlaceRow'
import { foundCount } from './progress'
import TreeSidebar, { type TreeNode } from './TreeSidebar'
import { mostWatchedFirst } from './reels'
import { setFound, type MyMarker, type UserData } from './user-data'

const MAX_PLACE_RESULTS = 40

const groupNodes: TreeNode[] = groups.map((group) => {
  const children = categories
    .filter((category) => category.group === group.id && pinCountByCategory.has(category.id))
    .map((category) => {
      const Icon = categoryIcon(category)
      return {
        id: category.id,
        title: category.name,
        icon: <Icon size={14} strokeWidth={2.25} />,
        color: category.color,
        iconColor: readableOn(category.color),
        count: pinCountByCategory.get(category.id) ?? 0,
      }
    })
  const GroupIcon = groupIcon(group.id)
  return {
    id: group.id,
    title: group.name,
    icon: <GroupIcon size={16} strokeWidth={2.25} />,
    color: group.color,
    iconColor: readableOn(group.color),
    count: children.reduce((total, child) => total + child.count, 0),
    children,
  }
})

/** A group holding a single category shows as one row that opens it, next to the other lists at the top. */
const standaloneCategories = groupNodes.flatMap((group) => (group.children!.length === 1 ? group.children! : []))
const tree = groupNodes.filter((group) => group.children!.length > 1)

function standaloneSubtitle(node: TreeNode): string {
  const blurb = categoryById.get(node.id)!.blurb
  return blurb ? `${node.count} places · ${blurb.toLowerCase()}` : `${node.count} places`
}

const allCategoryIds = categories.map((category) => category.id)

const COLLECTION_LOOK: Record<CollectionId, { icon: ReactNode; color: string; iconColor: string }> = {
  'must-see': { icon: <Flame size={16} strokeWidth={2.25} />, color: '#f97316', iconColor: '#ffffff' },
  reels: { icon: <Clapperboard size={16} strokeWidth={2.25} />, color: 'var(--color-primary)', iconColor: 'var(--color-primary-foreground)' },
}

/** The page open on top of the home list. */
type View = { kind: 'category'; id: string } | { kind: 'collection'; id: CollectionId } | { kind: 'my-map' }

/** Progress a reset would clear, waiting for the visitor to confirm. */
interface PendingReset {
  title: string
  pinIds: string[]
}

interface HomeRowProps {
  testId: string
  icon: ReactNode
  color: string
  iconColor: string
  title: string
  subtitle: string
  onClick: () => void
}

/** A row of the home list that opens a page; it looks like a group row of the tree below it. */
function HomeRow({ testId, icon, color, iconColor, title, subtitle, onClick }: HomeRowProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent/60"
    >
      <IconBadge size="lg" color={color} iconColor={iconColor}>
        {icon}
      </IconBadge>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs tabular-nums text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </button>
  )
}

const textLinkClass = 'cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground hover:underline'

interface MapSidebarProps {
  enabledCategories: ReadonlySet<string>
  /** How many pins the map is drawing right now. */
  shownPinCount: number
  userData: UserData
  hideFound: boolean
  onHideFoundChange: (hide: boolean) => void
  /** The one category or collection the map is narrowed to, if any. */
  focus: Focus | null
  onFocusChange: (focus: Focus | null) => void
  onCategoriesChange: (categoryIds: string[], enabled: boolean) => void
  onGoToPin: (pin: Pin) => void
  onGoToMarker: (marker: MyMarker) => void
  onAddMarker: () => void
  onCollapse: () => void
}

export function MapSidebar({
  enabledCategories, shownPinCount, userData, hideFound, onHideFoundChange, focus, onFocusChange, onCategoriesChange, onGoToPin, onGoToMarker, onAddMarker, onCollapse,
}: MapSidebarProps) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View | null>(null)
  const [pendingReset, setPendingReset] = useState<PendingReset | null>(null)
  /** The row that opened the current page; keyboard focus goes back to it when the page closes. */
  const opener = useRef<HTMLElement | null>(null)
  const needle = query.trim().toLowerCase()
  const { found } = userData
  const open = (next: View) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setView(next)
  }
  const goHome = () => setView(null)

  useEffect(() => {
    if (view !== null) return
    opener.current?.focus()
    opener.current = null
  }, [view])

  const focusIs = (candidate: Focus) => focus?.kind === candidate.kind && focus.id === candidate.id
  const focusToggle = (target: Focus) => ({
    onlyThese: focusIs(target),
    onOnlyTheseChange: (only: boolean) => onFocusChange(only ? target : null),
  })

  const homeRows: HomeRowProps[] = [
    {
      testId: 'must-see',
      ...COLLECTION_LOOK['must-see'],
      title: mustSee.name,
      subtitle: `${mustSee.pins.length} ${mustSee.blurb.toLowerCase()}`,
      onClick: () => open({ kind: 'collection', id: 'must-see' }),
    },
    {
      testId: 'reels',
      ...COLLECTION_LOOK.reels,
      title: withReels.name,
      subtitle: `${withReels.pins.length} places · ${withReels.blurb.toLowerCase()}`,
      onClick: () => open({ kind: 'collection', id: 'reels' }),
    },
    ...standaloneCategories.map((category) => ({
      testId: `category-${category.id}`,
      icon: category.icon,
      color: category.color ?? 'var(--color-primary)',
      iconColor: category.iconColor ?? 'var(--color-primary-foreground)',
      title: category.title,
      subtitle: standaloneSubtitle(category),
      onClick: () => open({ kind: 'category' as const, id: category.id }),
    })),
    {
      testId: 'my-map',
      icon: <Bookmark size={16} strokeWidth={2.25} />,
      color: 'var(--color-primary)',
      iconColor: 'var(--color-primary-foreground)',
      title: 'My map',
      subtitle: myMapSummary(userData),
      onClick: () => open({ kind: 'my-map' }),
    },
  ]
  const [mustSeeRow, ...otherRows] = homeRows
  const matchingRows = needle ? homeRows.filter((row) => row.title.toLowerCase().includes(needle)) : []

  const visibleTree = useMemo(
    () =>
      tree
        .map((group) => ({
          ...group,
          children: group
            .children!.filter((item) => !needle || item.title.toLowerCase().includes(needle))
            .map((item) => ({ ...item, done: foundCount(item.id, found) })),
        }))
        .filter((group) => group.children.length > 0),
    [needle, found],
  )

  const places = useMemo(() => {
    if (needle.length < 2) return []
    return pins.filter((pin) => pin.name.toLowerCase().includes(needle)).slice(0, MAX_PLACE_RESULTS)
  }, [needle])

  const openView = () => {
    if (view?.kind === 'my-map') {
      return (
        <MyMapView
          userData={userData}
          hideFound={hideFound}
          onHideFoundChange={onHideFoundChange}
          onResetProgress={() => setPendingReset({ title: 'Reset all progress?', pinIds: [...found] })}
          onGoToPin={onGoToPin}
          onGoToMarker={onGoToMarker}
          onAddMarker={onAddMarker}
          onBack={goHome}
        />
      )
    }
    if (view?.kind === 'collection') {
      const collection = collectionById[view.id]
      return (
        <PlaceList
          key={collection.id}
          {...COLLECTION_LOOK[collection.id]}
          title={collection.name}
          pins={collection.pins}
          found={found}
          describeBy="category"
          {...focusToggle({ kind: 'collection', id: collection.id })}
          onBack={goHome}
          onGoToPin={onGoToPin}
        />
      )
    }
    if (view?.kind === 'category') {
      const category = categoryById.get(view.id)!
      const Icon = categoryIcon(category)
      const categoryPins = pinsByCategory.get(category.id) ?? []
      const ids = categoryPins.map((pin) => pin.id)
      const done = foundCount(category.id, found)
      const shown = enabledCategories.has(category.id)
      const Visibility = shown ? Eye : EyeOff
      return (
        <PlaceList
          key={category.id}
          icon={<Icon size={16} strokeWidth={2.25} />}
          color={category.color}
          iconColor={readableOn(category.color)}
          title={category.name}
          pins={mostWatchedFirst(categoryPins)}
          found={found}
          describeBy="description"
          {...focusToggle({ kind: 'category', id: category.id })}
          onBack={goHome}
          onGoToPin={onGoToPin}
          action={
            <button
              type="button"
              aria-pressed={shown}
              aria-label={shown ? `Hide ${category.name} from the map` : `Show ${category.name} on the map`}
              title={shown ? 'Hide from the map' : 'Show on the map'}
              onClick={() => onCategoriesChange([category.id], !shown)}
              className={cn(
                'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent',
                shown ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Visibility size={16} />
            </button>
          }
          footer={
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <button type="button" disabled={done === ids.length} onClick={() => setFound(ids, true)} className={cn(textLinkClass, 'disabled:pointer-events-none disabled:opacity-40')}>
                Mark all as found
              </button>
              <button
                type="button"
                disabled={done === 0}
                onClick={() => setPendingReset({ title: `Reset progress for ${category.name}?`, pinIds: ids })}
                className={cn(textLinkClass, 'disabled:pointer-events-none disabled:opacity-40')}
              >
                Reset progress
              </button>
            </div>
          }
        />
      )
    }
    return null
  }

  return (
    <div className="relative h-full">
      <div className="h-full" inert={view !== null}>
        <TreeSidebar
          nodes={visibleTree}
          checkedIds={enabledCategories}
          onCheckedChange={onCategoriesChange}
          onOpenItem={(id) => open({ kind: 'category', id })}
          expandAll={needle !== ''}
          header={
            <div className="flex flex-col gap-3 border-b border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-foreground">Leonida Map</h1>
                  <p data-testid="shown-pin-count" className="text-sm tabular-nums text-muted-foreground">
                    Showing {shownPinCount.toLocaleString('en-US')} of {pins.length.toLocaleString('en-US')} places
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCollapse}
                  aria-label="Hide sidebar"
                  title="Hide sidebar"
                  className="-mr-1.5 -mt-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>
              <SearchInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={() => setQuery('')}
                placeholder="Search the map"
                aria-label="Search places and categories"
              />
              {focus && (
                <button
                  type="button"
                  data-testid="clear-only"
                  aria-label={`Stop showing only ${focusName(focus)}`}
                  onClick={() => onFocusChange(null)}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-3 text-sm font-medium text-primary"
                >
                  <span className="min-w-0 flex-1 truncate text-left">Only showing: {focusName(focus)}</span>
                  <X size={16} />
                </button>
              )}
            </div>
          }
        >
          {places.length > 0 && (
            <section className="mb-2 border-b border-border pb-2">
              <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Places</h2>
              <ul>
                {places.map((pin) => (
                  <PinRow key={pin.id} pin={pin} onClick={() => onGoToPin(pin)} />
                ))}
              </ul>
            </section>
          )}
          {matchingRows.map((row) => (
            <HomeRow key={row.testId} {...row} />
          ))}
          {needle && places.length === 0 && visibleTree.length === 0 && matchingRows.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {needle.length < 2 ? 'Type another letter to search places.' : `Nothing matches “${query.trim()}”.`}
            </p>
          )}
          {!needle && (
            <>
              <button
                type="button"
                data-testid={mustSeeRow.testId}
                onClick={mustSeeRow.onClick}
                className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 px-3 py-3 text-left text-white transition-opacity hover:opacity-90"
              >
                <Flame size={22} strokeWidth={2.25} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{mustSeeRow.title}</span>
                  <span className="block truncate text-xs text-white/90">{mustSeeRow.subtitle}</span>
                </span>
                <ChevronRight size={16} className="shrink-0" />
              </button>
              {otherRows.map((row) => (
                <HomeRow key={row.testId} {...row} />
              ))}
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-2 pb-1 pt-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All categories</h2>
                <span className="flex items-center gap-3">
                  <button type="button" onClick={() => onCategoriesChange(allCategoryIds, true)} className={textLinkClass}>
                    Show all
                  </button>
                  <button type="button" onClick={() => onCategoriesChange(allCategoryIds, false)} className={textLinkClass}>
                    Hide all
                  </button>
                </span>
              </div>
            </>
          )}
        </TreeSidebar>
      </div>
      {openView()}
      <ConfirmModal
        open={pendingReset !== null}
        onClose={() => setPendingReset(null)}
        onConfirm={() => {
          setFound(pendingReset!.pinIds, false)
          setPendingReset(null)
        }}
        title={pendingReset?.title ?? ''}
        description="The places you ticked as found go back to unfound. Favourites and notes stay."
        confirmText="Reset"
      />
    </div>
  )
}
