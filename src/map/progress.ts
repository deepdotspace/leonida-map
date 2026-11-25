/** Progress through a category: how many of its pins the visitor has ticked as found, and which to visit next. */

import { pinsByCategory, type Pin } from './pins'

export function foundCount(categoryId: string, found: ReadonlySet<string>): number {
  if (found.size === 0) return 0
  return (pinsByCategory.get(categoryId) ?? []).reduce((total, pin) => total + (found.has(pin.id) ? 1 : 0), 0)
}

/** The first unfound pin of the category after `after` (wrapping round), or its first unfound pin. */
export function nextUnfound(categoryId: string, found: ReadonlySet<string>, after?: Pin): Pin | undefined {
  const siblings = pinsByCategory.get(categoryId) ?? []
  const start = after ? siblings.indexOf(after) + 1 : 0
  for (let step = 0; step < siblings.length; step++) {
    const candidate = siblings[(start + step) % siblings.length]
    if (candidate !== after && !found.has(candidate.id)) return candidate
  }
  return undefined
}
