import type { CollectionSchema } from 'deepspace/schema'

/** Longest comment a visitor can post. */
export const COMMENT_MAX = 500

const nobody = { read: false, create: false, update: false, delete: false }

/**
 * What visitors say about a place. Anyone reads them and a signed-in visitor
 * posts, both through the worker (src/server/comment-routes.ts), so reading
 * needs no account and no record connection.
 */
export const commentsSchema: CollectionSchema = {
  name: 'comments',
  columns: [
    { name: 'pinId', storage: 'text', interpretation: 'plain', required: true, immutable: true, maxLength: 64 },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'name', storage: 'text', interpretation: 'plain', required: true },
    { name: 'imageUrl', storage: 'text', interpretation: 'plain' },
    { name: 'text', storage: 'text', interpretation: 'plain', required: true, maxLength: COMMENT_MAX },
    /** The comment this one replies to; empty for a comment on the place itself. */
    { name: 'parentId', storage: 'text', interpretation: 'plain', immutable: true },
    /** The ids of the accounts that upvoted it. */
    { name: 'upvoters', storage: 'text', interpretation: { kind: 'json' } },
    /** A deleted comment that has replies stays as an empty shell, so the replies keep their place. */
    { name: 'deleted', storage: 'number', interpretation: { kind: 'boolean' } },
  ],
  permissions: { viewer: nobody, member: nobody, admin: nobody },
}
