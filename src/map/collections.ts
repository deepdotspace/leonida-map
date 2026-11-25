/**
 * Hand-picked sets of pins that cut across categories: the "Must see" list and
 * every place that has a reel. The sidebar lists them and the map can show
 * just one of them.
 */

import mustSeeIds from './data/must-see.json'
import { pinById, pins, type Pin } from './pins'
import { mostWatchedFirst, pinIdsWithReels } from './reels'

export type CollectionId = 'must-see' | 'reels'

export interface PinCollection {
  id: CollectionId
  name: string
  blurb: string
  pins: Pin[]
  pinIds: ReadonlySet<string>
}

function collection(id: CollectionId, name: string, blurb: string, list: Pin[]): PinCollection {
  return { id, name, blurb, pins: list, pinIds: new Set(list.map((pin) => pin.id)) }
}

/** Easter eggs and the most talked-about places, in the order of `data/must-see.json`. */
export const mustSee = collection(
  'must-see',
  'Must see',
  'Easter eggs and famous spots',
  (mustSeeIds as string[]).flatMap((id) => pinById.get(id) ?? []),
)

export const withReels = collection(
  'reels',
  'Places with reels',
  'Watch how to find them',
  mostWatchedFirst(pins.filter((pin) => pinIdsWithReels.has(pin.id))),
)

export const collectionById: Record<CollectionId, PinCollection> = { 'must-see': mustSee, reels: withReels }
