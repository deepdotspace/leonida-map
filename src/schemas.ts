/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { mapSavesSchema } from './schemas/map-saves-schema'
import { reportsSchema } from './schemas/reports-schema'
import { dailyCountsSchema } from './schemas/daily-counts-schema'
import { commentsSchema } from './schemas/comments-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  mapSavesSchema,
  reportsSchema,
  dailyCountsSchema,
  commentsSchema,
]
