import type { CollectionSchema } from 'deepspace/schema'

/** What the map counts. Each is a plain daily total, with nothing about who the visitor is. */
export const COUNTED_EVENTS = ['visits', 'pinOpens', 'reelViews'] as const
export type CountedEvent = (typeof COUNTED_EVENTS)[number]

const nobody = { read: false, create: false, update: false, delete: false }

/**
 * One record per day (its id is the day, like "2026-11-25") holding that day's
 * totals. Only the worker reads and writes it (src/server/stats-routes.ts).
 */
export const dailyCountsSchema: CollectionSchema = {
  name: 'daily_counts',
  columns: COUNTED_EVENTS.map((name) => ({ name, storage: 'number', interpretation: 'plain' })),
  permissions: { viewer: nobody, member: nobody, admin: nobody },
}
