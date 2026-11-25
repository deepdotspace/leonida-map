/** The comments on each place: anyone reads; a signed-in visitor posts, replies and upvotes; the author or an admin deletes. */

import type { Hono } from 'hono'
import { resolveAppRole } from 'deepspace/worker'
import type { AppContext, Env } from '../../worker.js'
import { COMMENT_MAX } from '../schemas/comments-schema.js'
import { all, records, type StoredRecord } from './app-records.js'
import { resolveAuth } from './http-routes.js'

export interface PinComment {
  id: string
  /** The comment it replies to; empty for a comment on the place itself. */
  parentId: string
  name: string
  imageUrl: string
  text: string
  at: string
  votes: number
  /** Whether the visitor who asked has upvoted it. */
  voted: boolean
  /** Whether the visitor who asked may delete it. */
  canDelete: boolean
  deleted: boolean
}

const PIN_ID = /^[a-z0-9-]{1,64}$/
/** One account posts at most this many comments a minute. */
const POSTS_A_MINUTE = 5

function upvotersOf(data: StoredRecord['data']): string[] {
  return Array.isArray(data.upvoters) ? data.upvoters : []
}

/** The comment with this id, when it is on this place. */
async function commentOn(env: Env, pinId: string, recordId: string): Promise<StoredRecord | null> {
  const found = await records<{ record: StoredRecord }>(env, 'get', { collection: 'comments', recordId })
  return found?.record.data.pinId === pinId ? found.record : null
}

export function registerCommentRoutes(app: Hono<AppContext>): void {
  app.get('/api/comments/:pinId', async (c) => {
    const auth = await resolveAuth(c.req.raw, c.env)
    const admin = auth ? (await resolveAppRole(c.env, auth.userId)) === 'admin' : false
    const found = await all(c.env, 'comments', { pinId: c.req.param('pinId') })
    const comments: PinComment[] = found.map(({ recordId, createdAt, data }) => {
      const upvoters = upvotersOf(data)
      const deleted = Boolean(data.deleted)
      return {
        id: recordId,
        parentId: String(data.parentId ?? ''),
        name: String(data.name),
        imageUrl: String(data.imageUrl ?? ''),
        text: String(data.text),
        at: createdAt,
        votes: upvoters.length,
        voted: auth !== null && upvoters.includes(auth.userId),
        canDelete: !deleted && (admin || (auth !== null && data.userId === auth.userId)),
        deleted,
      }
    })
    return c.json(comments)
  })

  /** Everything below changes something, so it needs a signed-in visitor. */
  app.use('/api/comments/*', async (c, next) => {
    const auth = await resolveAuth(c.req.raw, c.env)
    if (!auth) return c.json({ error: 'unauthorized' }, 401)
    c.set('userId', auth.userId)
    return next()
  })

  app.post('/api/comments/:pinId', async (c) => {
    const userId = c.get('userId')
    const pinId = c.req.param('pinId')
    const body = (await c.req.json().catch(() => null)) as { text?: unknown; parentId?: unknown } | null
    const text = typeof body?.text === 'string' ? body.text.trim().replace(/\n{3,}/g, '\n\n') : ''
    const parentId = typeof body?.parentId === 'string' ? body.parentId : ''
    if (!PIN_ID.test(pinId) || !text || text.length > COMMENT_MAX) return c.json({ error: 'invalid' }, 400)
    if (parentId && !(await commentOn(c.env, pinId, parentId))) return c.json({ error: 'invalid' }, 400)
    const latest = await records<{ records: StoredRecord[] }>(c.env, 'query', {
      collection: 'comments',
      where: { userId },
      orderBy: 'createdAt',
      orderDir: 'desc',
      limit: POSTS_A_MINUTE,
    })
    const oldest = latest?.records[POSTS_A_MINUTE - 1]
    if (oldest && Date.now() - new Date(oldest.createdAt).getTime() < 60_000) return c.json({ error: 'too_fast' }, 429)
    const author = await records<{ record: StoredRecord }>(c.env, 'get', { collection: 'users', recordId: userId })
    const name = String(author?.record.data.name || 'Player')
    const imageUrl = String(author?.record.data.imageUrl ?? '')
    const saved = await records(c.env, 'create', { collection: 'comments', data: { pinId, userId, name, imageUrl, text, parentId, upvoters: [] } })
    return saved ? c.body(null, 204) : c.json({ error: 'failed' }, 500)
  })

  /** Upvote the comment, or take the upvote back. */
  app.post('/api/comments/:pinId/:id/vote', async (c) => {
    const userId = c.get('userId')
    const comment = await commentOn(c.env, c.req.param('pinId'), c.req.param('id'))
    if (!comment) return c.json({ error: 'not_found' }, 404)
    const upvoters = upvotersOf(comment.data)
    const next = upvoters.includes(userId) ? upvoters.filter((id) => id !== userId) : [...upvoters, userId]
    const saved = await records(c.env, 'update', { collection: 'comments', recordId: comment.recordId, data: { upvoters: next } })
    return saved ? c.body(null, 204) : c.json({ error: 'failed' }, 500)
  })

  app.delete('/api/comments/:pinId/:id', async (c) => {
    const userId = c.get('userId')
    const pinId = c.req.param('pinId')
    const comment = await commentOn(c.env, pinId, c.req.param('id'))
    if (!comment) return c.json({ error: 'not_found' }, 404)
    if (comment.data.userId !== userId && (await resolveAppRole(c.env, userId)) !== 'admin') return c.json({ error: 'forbidden' }, 403)
    const hasReplies = async (recordId: string) => {
      const replies = await records<{ records: StoredRecord[] }>(c.env, 'query', { collection: 'comments', where: { pinId, parentId: recordId }, limit: 1 })
      return replies ? replies.records.length > 0 : null
    }
    const replied = await hasReplies(comment.recordId)
    if (replied === null) return c.json({ error: 'failed' }, 500)
    if (replied) {
      const shell = { deleted: true, name: '[deleted]', imageUrl: '', text: '[deleted]', upvoters: [] }
      const saved = await records(c.env, 'update', { collection: 'comments', recordId: comment.recordId, data: shell })
      return saved ? c.body(null, 204) : c.json({ error: 'failed' }, 500)
    }
    /** Remove it, and with it any deleted comment above that is left with no replies. */
    for (let gone: StoredRecord | null = comment; gone; ) {
      if (!(await records(c.env, 'delete', { collection: 'comments', recordId: gone.recordId }))) return c.json({ error: 'failed' }, 500)
      const parent: StoredRecord | null = gone.data.parentId ? await commentOn(c.env, pinId, String(gone.data.parentId)) : null
      gone = parent?.data.deleted && (await hasReplies(parent.recordId)) === false ? parent : null
    }
    return c.body(null, 204)
  })
}
