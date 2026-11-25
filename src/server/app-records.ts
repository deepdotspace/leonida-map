import type { Env } from '../../worker.js'

export interface StoredRecord {
  recordId: string
  createdAt: string
  data: Record<string, unknown>
}

/** Run one record operation as the app itself, past the per-user permissions. Null when it fails or finds nothing. */
export async function records<T>(env: Env, tool: 'get' | 'query' | 'create' | 'update' | 'delete', params: Record<string, unknown>): Promise<T | null> {
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

/** Every record in a collection that matches `where`, read a page at a time. */
export async function all(env: Env, collection: string, where?: Record<string, unknown>): Promise<StoredRecord[]> {
  const found: StoredRecord[] = []
  let offset: number | undefined = 0
  while (offset !== undefined) {
    const page: { records: StoredRecord[]; nextOffset?: number } | null = await records(env, 'query', { collection, where, limit: 500, offset })
    found.push(...(page?.records ?? []))
    offset = page?.nextOffset
  }
  return found
}
