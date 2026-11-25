/**
 * Instagram reels attached to pins. Each reel is stored as its Instagram
 * shortcode and shown through Instagram's own embed, so no video is hosted here.
 */

import reelData from './data/reels.json'

export interface Reel {
  /** The id in the reel's address: instagram.com/reel/<code>/ */
  code: string
  /** Instagram username of the creator. */
  by: string
  /** Times the reel had been played when it was collected. */
  plays: number
}

export const reelsByPin = new Map<string, Reel[]>()
/** Plays of each pin's most watched reel. */
export const topPlaysByPin = new Map<string, number>()
for (const { code, by, plays, pins } of reelData as Array<Reel & { pins: string[] }>) {
  for (const pinId of pins) {
    const list = reelsByPin.get(pinId)
    if (list) list.push({ code, by, plays })
    else reelsByPin.set(pinId, [{ code, by, plays }])
    topPlaysByPin.set(pinId, Math.max(topPlaysByPin.get(pinId) ?? 0, plays))
  }
}

export const pinIdsWithReels: ReadonlySet<string> = new Set(reelsByPin.keys())

/** A play count the way Instagram writes it: 34.6M, 430K. */
export function formatPlays(plays: number): string {
  if (plays >= 1_000_000) return `${(plays / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (plays >= 1_000) return `${Math.round(plays / 1_000)}K`
  return String(plays)
}

/** Places with reels first, most watched at the top; the rest keep their order. */
export function mostWatchedFirst<T extends { id: string }>(places: T[]): T[] {
  return [...places].sort((a, b) => (topPlaysByPin.get(b.id) ?? 0) - (topPlaysByPin.get(a.id) ?? 0))
}
