/**
 * Which pins the map shows. Normally that is every pin of a switched-on
 * category. A focus narrows the map to one category or collection for the
 * moment ("Show only these"), without touching which categories are on.
 */

import { collectionById, type CollectionId } from './collections'
import { categoryById, pins, pinsByCategory, type Pin } from './pins'

export type Focus = { kind: 'category'; id: string } | { kind: 'collection'; id: CollectionId }

export function focusName(focus: Focus): string {
  return focus.kind === 'category' ? categoryById.get(focus.id)!.name : collectionById[focus.id].name
}

function focusPins(focus: Focus): Pin[] {
  return focus.kind === 'category' ? (pinsByCategory.get(focus.id) ?? []) : collectionById[focus.id].pins
}

interface Filter {
  enabledCategories: ReadonlySet<string>
  focus: Focus | null
  hideFound: boolean
  found: ReadonlySet<string>
}

export function visiblePins({ enabledCategories, focus, hideFound, found }: Filter): Pin[] {
  const shown = focus ? focusPins(focus) : pins.filter((pin) => enabledCategories.has(pin.category))
  return hideFound ? shown.filter((pin) => !found.has(pin.id)) : shown
}
