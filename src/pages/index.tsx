/**
 * The map — the app's front page, and a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 * It is prerendered to static HTML at build (prerender.ts), so the sidebar
 * must render without a browser. The map itself needs WebGL and loads only
 * in the browser, after the page has mounted.
 *
 * Everything a visitor saves (found places, favourites, notes, markers) lives
 * in the browser. The account code (src/account) is loaded only when the
 * visitor signs in, has signed in on this browser before, or reports a pin.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { MapPinPlus, PanelLeftOpen } from 'lucide-react'
import { usesAccount } from '../account/remembered'
import { SOURCE_URL } from '../constants'
import { SignInButton } from '../account/SignInButton'
import { Seo } from '../components/Seo'
import { count } from '@/lib/count'
import { readStored, readStoredJson, writeStored } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { CommentsPanel, type GetToken } from '../map/CommentsPanel'
import { visiblePins, type Focus } from '../map/filter'
import { FullscreenButton } from '../map/FullscreenButton'
import { mapButtonClass } from '../map/map-button'
import type { Selection } from '../map/MapCanvas'
import { ONLY_PARAM, PIN_PARAM } from '../map/links'
import { MapSidebar } from '../map/MapSidebar'
import { clampSidebarWidth, DEFAULT_SIDEBAR_WIDTH, SidebarResizeHandle } from '../map/SidebarResizeHandle'
import { MarkerCard } from '../map/MarkerCard'
import { MARKER_COLORS } from '../map/pin-images'
import { PinCard } from '../map/PinCard'
import { categories, categoryById, defaultEnabledCategories, pinById, type Pin } from '../map/pins'
import { saveMarker, useUserData } from '../map/user-data'
import { seo } from '../seo'

const MapCanvas = lazy(() => import('../map/MapCanvas').then((module) => ({ default: module.MapCanvas })))
const Account = lazy(() => import('../account/Account'))

/** The switched-off categories are what is stored, so a category added to the map later shows up for returning visitors. */
const HIDDEN_CATEGORIES_KEY = 'leonida-map:hidden-categories'
const HIDE_FOUND_KEY = 'leonida-map:hide-found'
const SIDEBAR_WIDTH_KEY = 'leonida-map:sidebar-width'
const COMMENTS_WIDTH_KEY = 'leonida-map:comments-width'
const DEFAULT_COMMENTS_WIDTH = 360

function storedEnabledCategories(): string[] {
  const hidden = readStoredJson(HIDDEN_CATEGORIES_KEY)
  if (!Array.isArray(hidden)) return defaultEnabledCategories
  return categories.filter((category) => !hidden.includes(category.id)).map((category) => category.id)
}

/** A dialog or menu that is open handles Escape itself. */
function overlayIsOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]') !== null
}

function MapLoading() {
  return <div className="flex h-full items-center justify-center bg-[#3090b0] text-sm text-white/80">Loading map…</div>
}

export default function Landing() {
  const [mounted, setMounted] = useState(false)
  const [enabledCategories, setEnabledCategories] = useState(() => new Set(defaultEnabledCategories))
  const [hideFound, setHideFound] = useState(false)
  /** Narrows the map to one category or collection for this visit; it is not saved. */
  const [focus, setFocus] = useState<Focus | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [placingMarker, setPlacingMarker] = useState(false)
  /** On phones the sidebar is a drawer that starts closed; on wider screens it is a panel that starts open. */
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [accountLoaded, setAccountLoaded] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [reportPin, setReportPin] = useState<Pin | null>(null)
  const [getToken, setGetToken] = useState<GetToken | null>(null)
  /** The comments panel stays hidden until the visitor asks for it from a place's card. */
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [commentsWidth, setCommentsWidth] = useState(DEFAULT_COMMENTS_WIDTH)
  const userData = useUserData()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const onlyCategory = categoryById.get(params.get(ONLY_PARAM) ?? '')
    if (onlyCategory) setFocus({ kind: 'category', id: onlyCategory.id })
    const enabled = new Set(storedEnabledCategories())
    const linkedPin = pinById.get(params.get(PIN_PARAM) ?? '')
    if (linkedPin) {
      enabled.add(linkedPin.category)
      setSelection({ kind: 'pin', pin: linkedPin, fly: true })
    }
    setEnabledCategories(enabled)
    setHideFound(readStored(HIDE_FOUND_KEY) === '1')
    const savedWidth = Number(readStored(SIDEBAR_WIDTH_KEY))
    if (savedWidth) setSidebarWidth(clampSidebarWidth(savedWidth))
    const savedCommentsWidth = Number(readStored(COMMENTS_WIDTH_KEY))
    if (savedCommentsWidth) setCommentsWidth(clampSidebarWidth(savedCommentsWidth))
    setAccountLoaded(usesAccount())
    setMounted(true)
    count('visits')
  }, [])

  const selectedPinId = selection?.kind === 'pin' ? selection.pin.id : null
  useEffect(() => {
    if (selectedPinId) count('pinOpens')
  }, [selectedPinId])
  useEffect(() => {
    if (!mounted) return
    const url = new URL(window.location.href)
    if (selectedPinId) url.searchParams.set(PIN_PARAM, selectedPinId)
    else url.searchParams.delete(PIN_PARAM)
    url.searchParams.delete(ONLY_PARAM)
    window.history.replaceState(window.history.state, '', url)
  }, [mounted, selectedPinId])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || overlayIsOpen()) return
      setSelection(null)
      setPlacingMarker(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const shownPins = useMemo(
    () => visiblePins({ enabledCategories, focus, hideFound, found: userData.found }),
    [enabledCategories, focus, hideFound, userData.found],
  )

  /** Switching categories on or off is a choice about the whole map, so it ends any focus. */
  const changeCategories = (categoryIds: string[], enabled: boolean) => {
    const next = new Set(enabledCategories)
    for (const id of categoryIds) {
      if (enabled) next.add(id)
      else next.delete(id)
    }
    setEnabledCategories(next)
    setFocus(null)
    writeStored(HIDDEN_CATEGORIES_KEY, JSON.stringify(categories.filter((category) => !next.has(category.id)).map((category) => category.id)))
    if (selection?.kind === 'pin' && !next.has(selection.pin.category)) setSelection(null)
  }

  const changeHideFound = (hide: boolean) => {
    setHideFound(hide)
    writeStored(HIDE_FOUND_KEY, hide ? '1' : '0')
  }

  /**
   * Open something picked from a list: show it, move the map to it, and get the phone drawer out of the way.
   * The open pin is always drawn, so a focus stays as it is; without one, the pin's category is switched on.
   */
  const goTo = (target: Selection) => {
    if (target.kind === 'pin' && !focus && !enabledCategories.has(target.pin.category)) changeCategories([target.pin.category], true)
    setSelection(target)
    setDrawerOpen(false)
  }
  const goToPin = (pin: Pin) => goTo({ kind: 'pin', pin, fly: true })

  const startPlacingMarker = () => {
    setSelection(null)
    setPlacingMarker(true)
    setDrawerOpen(false)
  }

  const placeMarker = (x: number, y: number) => {
    const id = crypto.randomUUID()
    saveMarker({ id, name: '', x, y, color: MARKER_COLORS[0], note: '' })
    setPlacingMarker(false)
    setSelection({ kind: 'marker', markerId: id, fly: false })
  }

  const openSignIn = () => {
    setAccountLoaded(true)
    setSignInOpen(true)
  }

  const reportProblem = (pin: Pin) => {
    setAccountLoaded(true)
    setReportPin(pin)
  }
  const closeReport = useCallback(() => setReportPin(null), [])
  /** A function is stored, so it is wrapped to keep React from calling it. */
  const changeSession = useCallback((next: GetToken | null) => setGetToken(() => next), [])

  const closeSidebar = () => {
    setDrawerOpen(false)
    setPanelOpen(false)
  }

  const openSidebar = () => {
    setDrawerOpen(true)
    setPanelOpen(true)
  }

  const selectedMarker = selection?.kind === 'marker' ? userData.markers.find((marker) => marker.id === selection.markerId) : undefined

  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="relative flex h-dvh overflow-hidden">
        {/* A drawer that slides over the map on phones; from md up a panel beside the map that slides out by a negative margin. */}
        <aside
          inert={!panelOpen}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
          className={cn(
            'absolute inset-y-0 left-0 z-20 w-[var(--sidebar-width)] max-w-[85vw] shrink-0 transition-[translate,margin-left,visibility] duration-300 ease-out motion-reduce:transition-none',
            'md:relative md:translate-x-0 md:shadow-none',
            // Hidden as well as moved off screen, so the closed drawer cannot be tabbed into.
            drawerOpen ? 'translate-x-0 shadow-2xl' : 'max-md:invisible -translate-x-full',
            !panelOpen && 'md:ml-[calc(var(--sidebar-width)*-1)]',
          )}
        >
          <SidebarResizeHandle
            side="left"
            defaultWidth={DEFAULT_SIDEBAR_WIDTH}
            label="Resize sidebar"
            testId="sidebar-resize"
            width={sidebarWidth} onWidthChange={setSidebarWidth} onWidthCommit={(width) => writeStored(SIDEBAR_WIDTH_KEY, String(width))} />
          <MapSidebar
            enabledCategories={enabledCategories}
            shownPinCount={shownPins.length}
            userData={userData}
            hideFound={hideFound}
            onHideFoundChange={changeHideFound}
            focus={focus}
            onFocusChange={setFocus}
            onCategoriesChange={changeCategories}
            onGoToPin={goToPin}
            onGoToMarker={(marker) => goTo({ kind: 'marker', markerId: marker.id, fly: true })}
            onAddMarker={startPlacingMarker}
            onCollapse={closeSidebar}
          />
        </aside>
        <button
          type="button"
          aria-label="Close sidebar"
          inert={!drawerOpen}
          onClick={() => setDrawerOpen(false)}
          className={cn(
            'absolute inset-0 z-10 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none md:hidden',
            !drawerOpen && 'pointer-events-none opacity-0',
          )}
        />

        <main className="relative min-w-0 flex-1">
          {mounted ? (
            <Suspense fallback={<MapLoading />}>
              <MapCanvas
                visiblePins={shownPins}
                userData={userData}
                selection={selection}
                onSelect={setSelection}
                onPlaceMarker={placingMarker ? placeMarker : null}
              >
                {selection?.kind === 'pin' && (
                  <PinCard key={selection.pin.id} pin={selection.pin} userData={userData} onGoTo={goToPin} onReport={reportProblem} commentCount={commentCount} commentsOpen={commentsOpen} onComments={() => setCommentsOpen((open) => !open)} />
                )}
                {selectedMarker && <MarkerCard key={selectedMarker.id} marker={selectedMarker} />}
              </MapCanvas>
            </Suspense>
          ) : (
            <MapLoading />
          )}

          <button type="button" onClick={openSidebar} className={cn(mapButtonClass, 'absolute left-3 top-3 px-3', panelOpen && 'md:hidden')}>
            <PanelLeftOpen size={16} />
            Filters
          </button>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <button
              type="button"
              data-testid="add-marker-button"
              aria-label="Add your own marker"
              title="Add your own marker"
              onClick={startPlacingMarker}
              className={mapButtonClass}
            >
              <MapPinPlus size={16} />
            </button>
            <FullscreenButton />
            {accountLoaded ? (
              <Suspense fallback={<SignInButton />}>
                <Account signInOpen={signInOpen} onSignInOpenChange={setSignInOpen} reportPin={reportPin} onReportClose={closeReport} onSession={changeSession} />
              </Suspense>
            ) : (
              <SignInButton onClick={openSignIn} />
            )}
          </div>

          {placingMarker && (
            <div
              data-testid="placing-marker"
              className="absolute left-1/2 top-16 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-border bg-card py-1.5 pl-4 pr-1.5 text-sm text-foreground shadow-lg"
            >
              Click the map to place your marker
              <button
                type="button"
                onClick={() => setPlacingMarker(false)}
                className="cursor-pointer rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          )}

          <p
            data-testid="made-with-deepspace"
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-lg backdrop-blur"
          >
            <a href="https://deep.space" target="_blank" rel="noopener" className="transition-colors hover:text-foreground">
              Made with <span className="font-semibold text-foreground">DeepSpace</span>
            </a>
            <span aria-hidden>·</span>
            <a href={SOURCE_URL} target="_blank" rel="noopener" className="transition-colors hover:text-foreground">
              Get the code
            </a>
          </p>
        </main>

        {/* The left sidebar mirrored: beside the map on wide screens, a drawer over it on narrow ones. */}
        {selection?.kind === 'pin' && (
          <aside
            inert={!commentsOpen}
            style={{ '--comments-width': `${commentsWidth}px` } as CSSProperties}
            className={cn(
              'absolute inset-y-0 right-0 z-20 w-[var(--comments-width)] max-w-[90vw] shrink-0 transition-[translate,margin-right,visibility] duration-300 ease-out motion-reduce:transition-none',
              'lg:relative lg:translate-x-0 lg:shadow-none',
              commentsOpen ? 'translate-x-0 shadow-2xl' : 'max-lg:invisible translate-x-full',
              !commentsOpen && 'lg:mr-[calc(var(--comments-width)*-1)]',
            )}
          >
            <SidebarResizeHandle
              side="right"
              defaultWidth={DEFAULT_COMMENTS_WIDTH}
              label="Resize comments"
              testId="comments-resize"
              width={commentsWidth}
              onWidthChange={setCommentsWidth}
              onWidthCommit={(width) => writeStored(COMMENTS_WIDTH_KEY, String(width))}
            />
            <CommentsPanel key={selection.pin.id} pin={selection.pin} getToken={getToken} onSignIn={openSignIn} onClose={() => setCommentsOpen(false)} onCountChange={setCommentCount} />
          </aside>
        )}
      </div>
    </>
  )
}
