/**
 * The zoomable Leonida map: raster tiles of the in-game map with the enabled
 * pins and the visitor's own markers on top. Zoomed out, pins that would sit
 * on top of each other are left out and fade in as the map zooms closer;
 * rarer categories win the space. Pins ticked as found are dimmed.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Feature, FeatureCollection, Point } from 'geojson'
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type PointLike,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { UNNAMED_MARKER } from './MarkerCard'
import { IMAGE_PIXEL_RATIO, markerImageId, pinImageId, renderPinImages } from './pin-images'
import { TILE_AREA, fromLngLat, pinById, pinCountByCategory, toLngLat, type Pin } from './pins'
import type { MyMarker, UserData } from './user-data'

setWorkerUrl(workerUrl)

const SEA_COLOR = '#3090b0'
const PIN_SOURCE = 'pins'
const PIN_LAYER = 'pins'
const MARKER_SOURCE = 'my-markers'
const MARKER_LAYER = 'my-markers'
const SELECTION_SOURCE = 'selection'
const FOUND_OPACITY = 0.4
/** From this zoom level every enabled pin is drawn, overlapping or not. */
const SHOW_ALL_PINS_ZOOM = 6
const FOCUS_ZOOM = 7
const NO_FEATURES: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] }

const [west, south] = toLngLat(TILE_AREA.west, TILE_AREA.south)
const [east, north] = toLngLat(TILE_AREA.east, TILE_AREA.north)
const tileBounds: [number, number, number, number] = [west, south, east, north]

/** The land itself, framed on first load. */
const landBounds: LngLatBoundsLike = [toLngLat(-10500, -9600), toLngLat(3900, 11000)]

const ATTRIBUTION =
  '<a href="https://map.gtadb.org" target="_blank" rel="noreferrer">Map tiles: GTADB (CC BY 4.0)</a> · ' +
  'Places: <a href="https://www.gtabase.com/gta-6/map/" target="_blank" rel="noreferrer">GTA Base</a> and contributors · ' +
  'Not affiliated with Rockstar Games'

/** What is open on the map: one of the map's pins or one of the visitor's own markers. */
export type Selection = (
  | { kind: 'pin'; pin: Pin }
  | { kind: 'marker'; markerId: string }
) & {
  /** Move the map to it (used when it was picked from a list rather than clicked). */
  fly: boolean
}

interface MapCanvasProps {
  /** The pins to draw. */
  visiblePins: Pin[]
  userData: UserData
  selection: Selection | null
  onSelect: (selection: Selection | null) => void
  /** While set, the next click on the map places a marker there instead of selecting. */
  onPlaceMarker: ((x: number, y: number) => void) | null
  /** The card for the current selection. */
  children: ReactNode
}

function pinFeature(pin: Pin, found: boolean): Feature<Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: toLngLat(pin.x, pin.y) },
    properties: {
      pinId: pin.id,
      name: pin.name,
      image: pinImageId(pin.category),
      found,
      /** Pins of small categories (the 22 banks) are placed before those of big ones (the 599 ATMs). */
      rank: pinCountByCategory.get(pin.category),
    },
  }
}

function markerFeature(marker: MyMarker): Feature<Point> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: toLngLat(marker.x, marker.y) },
    properties: { markerId: marker.id, name: marker.name || UNNAMED_MARKER, image: markerImageId(marker.color), found: false },
  }
}

function collection(features: Feature<Point>[]): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features }
}

/** The selection a clicked or hovered map feature stands for. */
function selectionOf(properties: Record<string, unknown>): Selection | null {
  if (typeof properties.markerId === 'string') return { kind: 'marker', markerId: properties.markerId, fly: false }
  const pin = pinById.get(properties.pinId as string)
  return pin ? { kind: 'pin', pin, fly: false } : null
}

/** Gap kept between the open card and the edge of the map, in pixels. */
const CARD_MARGIN = 12

function selectionKey(selection: Selection | null): string | undefined {
  if (!selection) return undefined
  return selection.kind === 'pin' ? selection.pin.id : selection.markerId
}

export function MapCanvas({ visiblePins, userData, selection, onSelect, onPlaceMarker, children }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const hoverLabelRef = useRef<Popup | null>(null)
  const [ready, setReady] = useState(false)
  const [cardHost] = useState(() => document.createElement('div'))

  const { found, markers } = userData
  const pinFeatures = useMemo(() => collection(visiblePins.map((pin) => pinFeature(pin, found.has(pin.id)))), [visiblePins, found])
  const markerFeatures = useMemo(() => collection(markers.map(markerFeature)), [markers])
  /** The selected pin or marker as a map feature; null when nothing is selected or the marker is gone. */
  const selectedFeature = useMemo(() => {
    if (!selection) return null
    if (selection.kind === 'pin') return pinFeature(selection.pin, false)
    const marker = markers.find((candidate) => candidate.id === selection.markerId)
    return marker ? markerFeature(marker) : null
  }, [selection, markers])
  const selectedPosition = selectedFeature?.geometry.coordinates as [number, number] | undefined
  const [selectedLng, selectedLat] = selectedPosition ?? []

  /** Latest props for the map's event handlers, which are attached once. */
  const live = useRef({ pinFeatures, markerFeatures, onSelect, onPlaceMarker, selectedKey: selectionKey(selection) })
  live.current = { pinFeatures, markerFeatures, onSelect, onPlaceMarker, selectedKey: selectionKey(selection) }

  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: {
        version: 8,
        sources: {
          leonida: {
            type: 'raster',
            tiles: [`${window.location.origin}/tiles/{z}/{x}/{y}.jpg`],
            tileSize: 512,
            minzoom: 1,
            maxzoom: 7,
            bounds: tileBounds,
            attribution: ATTRIBUTION,
          },
        },
        layers: [
          { id: 'sea', type: 'background', paint: { 'background-color': SEA_COLOR } },
          { id: 'leonida', type: 'raster', source: 'leonida', paint: { 'raster-fade-duration': 150 } },
        ],
      },
      bounds: landBounds,
      fitBoundsOptions: { padding: 24 },
      maxBounds: [toLngLat(-16300, -16300), toLngLat(16300, 16300)],
      minZoom: 0.6,
      maxZoom: 9.5,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 200,
      attributionControl: false,
    })
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

    let removed = false
    map.on('load', async () => {
      // MapLibre opens the credits until the map is first dragged; start them folded behind the info button.
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      const images = await renderPinImages()
      if (removed) return
      for (const image of images) map.addImage(image.id, image.data, { pixelRatio: IMAGE_PIXEL_RATIO })

      map.addSource(PIN_SOURCE, { type: 'geojson', data: live.current.pinFeatures })
      map.addSource(MARKER_SOURCE, { type: 'geojson', data: live.current.markerFeatures })
      map.addSource(SELECTION_SOURCE, { type: 'geojson', data: NO_FEATURES })
      map.addLayer({
        id: 'selection-halo',
        type: 'circle',
        source: SELECTION_SOURCE,
        paint: {
          'circle-radius': 24,
          'circle-color': '#ffffff',
          'circle-opacity': 0.35,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: PIN_LAYER,
        type: 'symbol',
        source: PIN_SOURCE,
        layout: {
          'icon-image': ['get', 'image'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.7, SHOW_ALL_PINS_ZOOM, 1],
          'icon-allow-overlap': ['step', ['zoom'], false, SHOW_ALL_PINS_ZOOM, true],
          'icon-padding': 0,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: { 'icon-opacity': ['case', ['get', 'found'], FOUND_OPACITY, 1] },
      })
      map.addLayer({
        id: MARKER_LAYER,
        type: 'symbol',
        source: MARKER_SOURCE,
        layout: { 'icon-image': ['get', 'image'], 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      })
      map.addLayer({
        id: 'selection-pin',
        type: 'symbol',
        source: SELECTION_SOURCE,
        layout: { 'icon-image': ['get', 'image'], 'icon-size': 1.3, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      })
      setReady(true)
    })

    const hoverLabel = new Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 18,
      maxWidth: 'min(320px, calc(100vw - 32px))',
      className: 'pin-hover-label',
    })
    hoverLabelRef.current = hoverLabel
    map.on('mouseout', () => hoverLabel.remove())
    // How many pins are on screen once the map has settled, for the browser tests.
    map.on('idle', () => {
      if (map.getLayer(PIN_LAYER)) map.getContainer().dataset.pinsDrawn = String(map.queryRenderedFeatures({ layers: [PIN_LAYER] }).length)
    })

    const featureAt = (point: PointLike) =>
      map.getLayer(PIN_LAYER) ? map.queryRenderedFeatures(point, { layers: [MARKER_LAYER, PIN_LAYER] })[0] : undefined

    map.on('click', (event) => {
      const { onPlaceMarker, onSelect } = live.current
      if (onPlaceMarker) {
        const { x, y } = fromLngLat(event.lngLat.lng, event.lngLat.lat)
        onPlaceMarker(x, y)
        return
      }
      const feature = featureAt(event.point)
      onSelect(feature ? selectionOf(feature.properties) : null)
    })

    map.on('mousemove', (event) => {
      if (live.current.onPlaceMarker) return
      const feature = featureAt(event.point)
      map.getCanvas().style.cursor = feature ? 'pointer' : ''
      if (feature && selectionKey(selectionOf(feature.properties)) !== live.current.selectedKey) {
        hoverLabel
          .setLngLat((feature.geometry as Point).coordinates as [number, number])
          .setText(feature.properties.name)
          .addTo(map)
      } else {
        hoverLabel.remove()
      }
    })

    return () => {
      removed = true
      mapRef.current = null
      setReady(false)
      map.remove()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    mapRef.current?.getSource<GeoJSONSource>(PIN_SOURCE)?.setData(pinFeatures)
    hoverLabelRef.current?.remove()
  }, [ready, pinFeatures])

  useEffect(() => {
    if (!ready) return
    mapRef.current?.getSource<GeoJSONSource>(MARKER_SOURCE)?.setData(markerFeatures)
  }, [ready, markerFeatures])

  const placing = onPlaceMarker !== null
  useEffect(() => {
    if (!ready) return
    mapRef.current!.getCanvas().style.cursor = placing ? 'crosshair' : ''
    if (placing) hoverLabelRef.current?.remove()
  }, [ready, placing])

  useEffect(() => {
    if (!ready) return
    mapRef.current?.getSource<GeoJSONSource>(SELECTION_SOURCE)?.setData(selectedFeature ?? NO_FEATURES)
  }, [ready, selectedFeature])

  const selectedKey = selectionKey(selection)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || selectedLng === undefined || selectedLat === undefined) return
    const position: [number, number] = [selectedLng, selectedLat]
    const card = new Popup({ closeOnClick: false, focusAfterOpen: false, offset: 24, maxWidth: 'min(340px, calc(100vw - 32px))', className: 'pin-card-popup' })
      .setLngLat(position)
      .setDOMContent(cardHost)
      .addTo(map)
    const handleClose = () => live.current.onSelect(null)
    card.on('close', handleClose)
    hoverLabelRef.current?.remove()

    /**
     * Runs whenever the card changes size. MapLibre picks the side of the pin with room for the card,
     * but only from the size it had when it opened, so ask it again, then slide the map for whatever still sticks out.
     */
    const keepCardInView = () => {
      map.off('moveend', keepCardInView)
      if (map.isMoving()) {
        map.once('moveend', keepCardInView)
        return
      }
      card.setLngLat(position)
      const view = map.getContainer().getBoundingClientRect()
      const box = card.getElement().getBoundingClientRect()
      const across = Math.min(0, box.left - view.left - CARD_MARGIN) + Math.max(0, box.right - view.right + CARD_MARGIN)
      const down = Math.min(0, box.top - view.top - CARD_MARGIN) + Math.max(0, box.bottom - view.bottom + CARD_MARGIN)
      if (across !== 0 || down !== 0) map.panBy([across, down])
    }
    const cardSize = new ResizeObserver(keepCardInView)
    cardSize.observe(cardHost)

    return () => {
      cardSize.disconnect()
      map.off('moveend', keepCardInView)
      card.off('close', handleClose)
      card.remove()
    }
  }, [ready, selectedKey, selectedLng, selectedLat, cardHost])

  /** Runs for every pick from a list, so picking the place that is already open brings the map back to it. */
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !selection?.fly || selectedLng === undefined || selectedLat === undefined) return
    // The card opens above the pin, so bring the pin to rest below the middle of the view to leave the card room.
    map.easeTo({ center: [selectedLng, selectedLat], zoom: Math.max(map.getZoom(), FOCUS_ZOOM), offset: [0, map.getContainer().clientHeight * 0.28] })
  }, [ready, selection, selectedLng, selectedLat])

  return (
    <>
      <div ref={containerRef} data-testid="map-canvas" className="h-full w-full" style={{ backgroundColor: SEA_COLOR }} />
      {selectedFeature && createPortal(children, cardHost)}
    </>
  )
}
