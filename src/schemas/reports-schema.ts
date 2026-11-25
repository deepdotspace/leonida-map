import type { CollectionSchema } from 'deepspace/schema'

export const REPORT_PROBLEMS = ['Wrong spot', 'Wrong name', 'No longer there', 'Something else'] as const

/** Longest note a visitor can add to a report. */
export const REPORT_DETAILS_MAX = 500

const reportFields = ['pinId', 'problem', 'details']

/** Problems visitors report on a pin. Anyone can file one, signed in or not; only admins read them. */
export const reportsSchema: CollectionSchema = {
  name: 'reports',
  columns: [
    { name: 'pinId', storage: 'text', interpretation: 'plain', required: true, immutable: true, maxLength: 64 },
    { name: 'problem', storage: 'text', interpretation: { kind: 'select', options: [...REPORT_PROBLEMS] }, required: true, maxLength: 32 },
    { name: 'details', storage: 'text', interpretation: 'plain', maxLength: REPORT_DETAILS_MAX },
  ],
  permissions: {
    viewer: { read: false, create: true, update: false, delete: false, writableFields: reportFields },
    member: { read: false, create: true, update: false, delete: false, writableFields: reportFields },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
