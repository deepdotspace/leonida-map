import type { CollectionSchema } from 'deepspace/schema'

/**
 * A signed-in visitor's saved map data (found places, favourites, notes and
 * their own markers), private to them. It is split into one record per bucket
 * (a pin category, or "markers") so ticking one place rewrites a small record
 * rather than everything the visitor ever saved. `entries` has the shape of
 * `Entries` in src/map/user-data.ts.
 */
export const mapSavesSchema: CollectionSchema = {
  name: 'map_saves',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true },
    { name: 'bucket', storage: 'text', interpretation: 'plain', required: true, immutable: true, maxLength: 64 },
    { name: 'entries', storage: 'text', interpretation: { kind: 'json' }, required: true },
  ],
  uniqueOn: ['userId', 'bucket'],
  ownerField: 'userId',
  permissions: {
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: 'own', create: true, update: 'own', delete: 'own' },
  },
}
