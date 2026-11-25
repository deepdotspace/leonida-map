import type { CountedEvent } from '../schemas/daily-counts-schema'

/** Adds one to today's anonymous total for this event. Sends nothing about the visitor. */
export function count(event: CountedEvent) {
  navigator.sendBeacon(`/api/count/${event}`)
}
