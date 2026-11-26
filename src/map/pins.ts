/**
 * Pin data for the Leonida map: the category tree, every pin, and the
 * conversion from in-game coordinates to the map's longitude/latitude.
 */

import categoryData from './data/categories.json'
import markerData from './data/markers.json'

export interface Group {
  id: string
  name: string
  color: string
}

export interface Category {
  id: string
  name: string
  group: string
  color: string
  hiddenByDefault: boolean
  /** A few words on what sets the category apart, shown under its name. */
  blurb?: string
}

export interface Pin {
  id: string
  name: string
  category: string
  /** In-game coordinates in metres; y grows northwards. */
  x: number
  y: number
  description?: string
  url?: string
  /** Player who reported the location. */
  foundBy?: string
  /** Editor who added the location. */
  addedBy?: string
  /** What the player needs before this can be done, such as a chapter or a time of day. */
  requires?: string
  /** How to get or see it, in order, when it takes more than going there. */
  steps?: string[]
}

export const groups: Group[] = categoryData.groups.map(({ id, name, color }) => ({ id, name, color }))

const groupColor = new Map(groups.map((group) => [group.id, group.color]))

export const categories: Category[] = (
  categoryData.categories as Array<{ id: string; name: string; group: string; color?: string; hidden_default?: boolean; blurb?: string }>
).map((category) => ({
  id: category.id,
  name: category.name,
  group: category.group,
  color: category.color ?? groupColor.get(category.group) ?? '#64748b',
  hiddenByDefault: category.hidden_default === true,
  blurb: category.blurb,
}))

export const categoryById = new Map(categories.map((category) => [category.id, category]))

export const pins = (markerData as Pin[]).filter((pin) => categoryById.has(pin.category))

export const pinById = new Map(pins.map((pin) => [pin.id, pin]))

export const pinCountByCategory = new Map<string, number>()
/** Each pin's position within its category, counted from 1. */
export const pinNumberInCategory = new Map<string, number>()
for (const pin of pins) {
  const number = (pinCountByCategory.get(pin.category) ?? 0) + 1
  pinCountByCategory.set(pin.category, number)
  pinNumberInCategory.set(pin.id, number)
}

export const pinsByCategory = new Map<string, Pin[]>()
for (const pin of pins) {
  const list = pinsByCategory.get(pin.category)
  if (list) list.push(pin)
  else pinsByCategory.set(pin.category, [pin])
}

/** Categories that have pins, and so have a list page. */
export const listedCategories = categories.filter((category) => pinCountByCategory.has(category.id))

export const defaultEnabledCategories = categories.filter((category) => !category.hiddenByDefault).map((category) => category.id)

/**
 * The game world is a 32,768 m square centred on the origin. The map treats
 * that square as the whole Web Mercator world, so a tile pyramid cut from it
 * lines up with standard z/x/y tile addresses.
 */
const WORLD_SIZE = 32768
const HALF_WORLD = WORLD_SIZE / 2

export function toLngLat(x: number, y: number): [number, number] {
  const u = (x + HALF_WORLD) / WORLD_SIZE
  const v = (HALF_WORLD - y) / WORLD_SIZE
  const lng = u * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * v))) * 180) / Math.PI
  return [lng, lat]
}

export function fromLngLat(lng: number, lat: number): { x: number; y: number } {
  const u = (lng + 180) / 360
  const v = (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2
  return { x: Math.round(u * WORLD_SIZE - HALF_WORLD), y: Math.round(HALF_WORLD - v * WORLD_SIZE) }
}

/** Area covered by map tiles, in game coordinates. */
export const TILE_AREA = { west: -12032, east: 5120, south: -10112, north: 12032 }

/** Labelled values that pin descriptions carry after the prose, e.g. "Take value: $75,000 - $135,000". */
const FIELD_LABELS = new Set([
  'Set',
  'Robbery',
  'Take value',
  'Security',
  'Gang',
  'Style',
  'Inventory',
  'Specialty',
  'Parking spots',
  'Price',
  'Unlocked',
  'Narcotics',
  'Jewelry',
  'Marked bills',
  'Code',
  'Computer password',
  'Door code',
  'Safe code',
])

export interface PinDetails {
  prose: string
  fields: Array<{ label: string; value: string }>
}

/**
 * Pull the labelled fields out of a description. Fields are `;`-separated
 * parts that start with a known label; everything else stays as prose,
 * including any `;` the sentences themselves use.
 */
export function parseDescription(description: string | undefined): PinDetails {
  const fields: PinDetails['fields'] = []
  const prose: string[] = []
  for (const part of (description ?? '').split(';')) {
    const text = part.trim()
    if (!text) continue
    const separator = text.indexOf(': ')
    const label = separator > 0 ? text.slice(0, separator) : ''
    if (FIELD_LABELS.has(label)) {
      fields.push({ label, value: text.slice(separator + 2).replace(/\.$/, '') })
    } else {
      prose.push(text)
    }
  }
  return { prose: prose.join('; '), fields }
}
