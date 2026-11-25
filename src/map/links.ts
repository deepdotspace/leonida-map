/** Addresses that open the map on something, shared by the map page (which reads them) and the pages that link to it. */

/** Query parameter naming the open pin, so a pin's address can be shared. */
export const PIN_PARAM = 'pin'
/** Query parameter that opens the map showing a single category. */
export const ONLY_PARAM = 'only'

export function pinLink(pinId: string): string {
  return `/?${PIN_PARAM}=${encodeURIComponent(pinId)}`
}

export function categoryOnlyLink(categoryId: string): string {
  return `/?${ONLY_PARAM}=${encodeURIComponent(categoryId)}`
}
