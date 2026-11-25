/**
 * The anonymous daily counter and the admin dashboard's data.
 *
 * Both go through the worker rather than the browser's record connection: a
 * visitor without an account never opens one, and the dashboard needs totals
 * across every account's private saved data.
 */

import type { Hono } from 'hono'
import { resolveAppRole } from 'deepspace/worker'
import type { AppContext, Env } from '../../worker.js'
import { COUNTED_EVENTS, type CountedEvent } from '../schemas/daily-counts-schema.js'
import { resolveAuth } from './http-routes.js'

interface StoredRecord {
  recordId: string
  createdAt: string
  data: Record<string, unknown>
}

/** Run one record operation as the app itself, past the per-user permissions. */
async function records<T>(env: Env, tool: 'get' | 'query' | 'create' | 'update', params: Record<string, unknown>): Promise<T | null> {
  const room = env.RECORD_ROOMS.get(env.RECORD_ROOMS.idFromName(`app:${env.DEEPSPACE_APP_ID}`))
  const response = await room.fetch(
    new Request('https://internal/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': env.OWNER_USER_ID, 'X-App-Action': 'true' },
      body: JSON.stringify({ tool: `records.${tool}`, params }),
    }),
  )
  const result = (await response.json()) as { success: boolean; data?: T }
  return result.success ? (result.data ?? null) : null
}

async function all(env: Env, collection: string): Promise<StoredRecord[]> {
  const found: StoredRecord[] = []
  let offset: number | undefined = 0
  while (offset !== undefined) {
    const page: { records: StoredRecord[]; nextOffset?: number } | null = await records(env, 'query', { collection, limit: 500, offset })
    found.push(...(page?.records ?? []))
    offset = page?.nextOffset
  }
  return found
}

const dayOf = (time: string | number | Date) => new Date(time).toISOString().slice(0, 10)

/** How many accounts have each kind of saved thing: found places, favourites, notes, own markers. */
function savedCounts(saves: StoredRecord[]): Record<string, number> {
  const accounts: Record<string, Set<unknown>> = {}
  for (const { data } of saves) {
    const entries = typeof data.entries === 'string' ? JSON.parse(data.entries) : data.entries
    for (const [key, entry] of Object.entries((entries ?? {}) as Record<string, [number, unknown]>)) {
      if (entry[1] === null) continue
      const kind = key.slice(0, key.indexOf(':'))
      ;(accounts[kind] ??= new Set()).add(data.userId)
    }
  }
  return Object.fromEntries(Object.entries(accounts).map(([kind, users]) => [kind, users.size]))
}

async function stats(env: Env) {
  const [users, saves, counts, reports] = await Promise.all(['users', 'map_saves', 'daily_counts', 'reports'].map((name) => all(env, name)))
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const signupsByDay: Record<string, number> = {}
  for (const user of users) {
    const day = dayOf((user.data.createdAt as string) || user.createdAt)
    signupsByDay[day] = (signupsByDay[day] ?? 0) + 1
  }
  return {
    signups: users.length,
    activeThisWeek: users.filter((user) => new Date((user.data.lastSeenAt as string) || 0).getTime() > weekAgo).length,
    signupsByDay,
    saved: savedCounts(saves),
    countsByDay: Object.fromEntries(counts.map((record) => [record.recordId, record.data])),
    reports: reports
      .map((report) => ({ id: report.recordId, at: report.createdAt, ...(report.data as { pinId: string; problem: string; details?: string; resolved?: boolean }) }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  }
}

export type Stats = Awaited<ReturnType<typeof stats>>

export function registerStatsRoutes(app: Hono<AppContext>): void {
  // Adds one to today's total for an event. Reading then writing can lose a
  // count when two arrive at the same instant, which is fine for a rough total.
  app.post('/api/count/:event', async (c) => {
    const event = c.req.param('event') as CountedEvent
    if (!COUNTED_EVENTS.includes(event)) return c.json({ error: 'not_found' }, 404)
    const day = dayOf(Date.now())
    const today = await records<{ record: StoredRecord }>(c.env, 'get', { collection: 'daily_counts', recordId: day })
    const total = Number(today?.record.data[event] ?? 0) + 1
    await records(c.env, 'create', { collection: 'daily_counts', recordId: day, data: { [event]: total } })
    return c.body(null, 204)
  })

  app.use('/api/admin/*', async (c, next) => {
    const auth = await resolveAuth(c.req.raw, c.env)
    if (!auth) return c.json({ error: 'unauthorized' }, 401)
    if ((await resolveAppRole(c.env, auth.userId)) !== 'admin') return c.json({ error: 'forbidden' }, 403)
    await next()
  })

  app.get('/api/admin/stats', async (c) => c.json(await stats(c.env)))

  app.post('/api/admin/reports/:id', async (c) => {
    const { resolved } = (await c.req.json()) as { resolved: boolean }
    const saved = await records(c.env, 'update', { collection: 'reports', recordId: c.req.param('id'), data: { resolved: resolved === true } })
    return saved ? c.body(null, 204) : c.json({ error: 'not_found' }, 404)
  })
}
