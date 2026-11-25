/**
 * Everything a visitor saves on the map: places ticked as found, favourites,
 * private notes and their own markers.
 *
 * It is one flat map of entries, each stamped with the time it last changed.
 * It lives in this browser's storage, so the map works without an account.
 * Removing something keeps the entry with a null value, so two copies (this
 * browser and a signed-in account) merge by keeping the newer entry per key
 * and a removal on one device is not undone by an older copy on another.
 */

import { useMemo, useSyncExternalStore } from 'react'
import { readStored, readStoredJson, writeStored } from '@/lib/storage'
import { pinById } from './pins'

/** `[changed at (ms), value]`; a null value means "removed". */
export type Entry = [at: number, value: unknown]
export type Entries = Readonly<Record<string, Entry>>

export interface MyMarker {
  id: string
  name: string
  /** In-game coordinates, like a pin's. */
  x: number
  y: number
  color: string
  note: string
}

export interface UserData {
  found: ReadonlySet<string>
  favourites: ReadonlySet<string>
  /** Note text by pin id. */
  notes: ReadonlyMap<string, string>
  markers: MyMarker[]
}

const STORAGE_KEY = 'leonida-map:user-data'
/** The account the saved data belongs to, once someone has signed in on this browser. */
const OWNER_KEY = 'leonida-map:owner'
const FOUND = 'found:'
const FAVOURITE = 'fav:'
const NOTE = 'note:'
const MARKER = 'marker:'
const NO_ENTRIES: Entries = {}

function isNewer(candidate: Entry, current: Entry): boolean {
  if (candidate[0] !== current[0]) return candidate[0] > current[0]
  return JSON.stringify(candidate[1]) > JSON.stringify(current[1])
}

/** `base` plus every entry of `other` that is newer. Returns `base` itself when `other` adds nothing. */
export function mergeEntries(base: Entries, other: Entries): Entries {
  let merged: Record<string, Entry> | null = null
  for (const [key, entry] of Object.entries(other)) {
    const current = base[key]
    if (current && !isNewer(entry, current)) continue
    merged ??= { ...base }
    merged[key] = entry
  }
  return merged ?? base
}

/**
 * Which account record an entry is stored in: the pin id without its number
 * (so roughly one record per kind of place), or one record for all the
 * visitor's markers. Small records keep each write small.
 */
export function bucketOf(key: string): string {
  if (key.startsWith(MARKER)) return 'markers'
  return key.slice(key.indexOf(':') + 1).replace(/-\d+$/, '')
}

export function splitIntoBuckets(source: Entries): Map<string, Record<string, Entry>> {
  const buckets = new Map<string, Record<string, Entry>>()
  for (const [key, entry] of Object.entries(source)) {
    const bucket = bucketOf(key)
    let bucketEntries = buckets.get(bucket)
    if (!bucketEntries) buckets.set(bucket, (bucketEntries = {}))
    bucketEntries[key] = entry
  }
  return buckets
}

let entries: Entries | null = null
const listeners = new Set<() => void>()

function isEntry(value: unknown): value is Entry {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'number'
}

/** The well-formed entries of a stored or synced copy; anything else in it is ignored. */
export function validEntries(source: unknown): Entries {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return NO_ENTRIES
  const valid: Record<string, Entry> = {}
  for (const [key, entry] of Object.entries(source)) if (isEntry(entry)) valid[key] = entry
  return valid
}

function readStorage(): Entries {
  return validEntries(readStoredJson(STORAGE_KEY))
}

export function getEntries(): Entries {
  entries ??= readStorage()
  return entries
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', adoptOtherTab)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return
    window.removeEventListener('storage', adoptOtherTab)
    // Nobody is listening for other tabs' changes any more, so read storage afresh next time.
    entries = null
  }
}

function publish(next: Entries) {
  entries = next
  for (const listener of listeners) listener()
}

function adoptOtherTab(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return
  publish(event.newValue === null ? NO_ENTRIES : mergeEntries(getEntries(), readStorage()))
}

/** Take in entries from another copy (the signed-in account). */
export function mergeIntoLocal(other: unknown) {
  const merged = mergeEntries(getEntries(), validEntries(other))
  if (merged !== getEntries()) save(merged)
}

/** Keeps whatever another tab stored in the meantime. */
function save(next: Entries) {
  const merged = mergeEntries(readStorage(), next)
  publish(merged)
  writeStored(STORAGE_KEY, JSON.stringify(merged))
}

function write(changes: Record<string, unknown>) {
  const now = Date.now()
  const next: Record<string, Entry> = { ...getEntries() }
  // Stamp after the entry being replaced, so a change made here wins even if another device's clock runs ahead.
  for (const [key, value] of Object.entries(changes)) next[key] = [Math.max(now, (next[key]?.[0] ?? 0) + 1), value]
  save(next)
}

/** Empty this browser's copy; the account keeps its own. */
export function forgetSavedData() {
  publish(NO_ENTRIES)
  writeStored(STORAGE_KEY, null)
  writeStored(OWNER_KEY, null)
}

/**
 * Called when someone is signed in. Data saved before any sign-in becomes
 * theirs; data left by a different account is dropped rather than mixed in.
 */
export function claimSavedData(userId: string) {
  const owner = readStored(OWNER_KEY)
  if (owner && owner !== userId) forgetSavedData()
  writeStored(OWNER_KEY, userId)
}

export function setFound(pinIds: string[], found: boolean) {
  write(Object.fromEntries(pinIds.map((id) => [FOUND + id, found ? true : null])))
}

export function setFavourite(pinId: string, favourite: boolean) {
  write({ [FAVOURITE + pinId]: favourite ? true : null })
}

export function setNote(pinId: string, text: string) {
  write({ [NOTE + pinId]: text.trim() || null })
}

export function saveMarker(marker: MyMarker) {
  write({ [MARKER + marker.id]: marker })
}

export function deleteMarker(markerId: string) {
  write({ [MARKER + markerId]: null })
}

/** The last found set handed out, reused while its members are unchanged so the map redraws its pins only when they change. */
let lastFound: ReadonlySet<string> = new Set()

function isMarker(value: unknown): value is MyMarker {
  if (typeof value !== 'object' || value === null) return false
  const { id, name, x, y, color, note } = value as Record<string, unknown>
  return (
    typeof id === 'string' && typeof name === 'string' && typeof x === 'number' && typeof y === 'number' && typeof color === 'string' && typeof note === 'string'
  )
}

/** Entries about a pin the map no longer has, or with a value of the wrong type, are left out. */
function toUserData(source: Entries): UserData {
  const ticked = new Set<string>()
  const favourites = new Set<string>()
  const notes = new Map<string, string>()
  const markers: MyMarker[] = []
  const pinIdAfter = (key: string, prefix: string) => {
    const id = key.slice(prefix.length)
    return key.startsWith(prefix) && pinById.has(id) ? id : null
  }
  for (const [key, [, value]] of Object.entries(source)) {
    if (value === null) continue
    const foundId = pinIdAfter(key, FOUND)
    const favouriteId = pinIdAfter(key, FAVOURITE)
    const noteId = pinIdAfter(key, NOTE)
    if (foundId) ticked.add(foundId)
    else if (favouriteId) favourites.add(favouriteId)
    else if (noteId && typeof value === 'string') notes.set(noteId, value)
    else if (key.startsWith(MARKER) && isMarker(value)) markers.push(value)
  }
  const unchanged = ticked.size === lastFound.size && [...ticked].every((id) => lastFound.has(id))
  if (!unchanged) lastFound = ticked
  markers.sort((a, b) => a.name.localeCompare(b.name))
  return { found: lastFound, favourites, notes, markers }
}

/** The raw entries, for syncing. Empty while prerendering and hydrating. */
export function useEntries(): Entries {
  return useSyncExternalStore(subscribe, getEntries, () => NO_ENTRIES)
}

export function useUserData(): UserData {
  const source = useEntries()
  return useMemo(() => toUserData(source), [source])
}
