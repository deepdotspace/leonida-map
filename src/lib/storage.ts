/**
 * This browser's storage, for the things the map remembers between visits.
 * Storage can be blocked (private windows, strict settings) or full; reads
 * then return null and writes are skipped, so the page keeps working.
 */

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Stores `value`, or removes the key when `value` is null. */
export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Blocked or full: the change still applies for this visit.
  }
}

/** The stored JSON value, or null when nothing readable is stored. */
export function readStoredJson(key: string): unknown {
  const saved = readStored(key)
  if (saved === null) return null
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}
