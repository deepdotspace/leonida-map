/**
 * Keeps the signed-in visitor's account and this browser in step. Whatever
 * the account holds is merged into the browser, and whatever the browser has
 * that is newer is written to the account, one record per bucket. The first
 * sign-in on a browser therefore uploads everything saved there so far.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useAuthUser, useMutations, useQuery } from 'deepspace'
import { claimSavedData, mergeEntries, mergeIntoLocal, splitIntoBuckets, useEntries, type Entries } from '../map/user-data'

interface SavedBucket {
  bucket: string
  entries: Entries
}

/** Wait for a pause in changes before writing, so a burst (ticking a whole category) is one write. */
const WRITE_DELAY_MS = 700

export function SyncSavedData() {
  const local = useEntries()
  const { records, status } = useQuery<SavedBucket>('map_saves')
  const { ready, createConfirmed, putConfirmed } = useMutations<SavedBucket>('map_saves')
  const writing = useRef(new Set<string>())
  const userId = useAuthUser().user?.id

  const saved = useMemo(() => new Map(records.map((record) => [record.data.bucket, record])), [records])

  useEffect(() => {
    if (userId) claimSavedData(userId)
  }, [userId])

  useEffect(() => {
    if (status !== 'ready') return
    for (const record of saved.values()) mergeIntoLocal(record.data.entries)
  }, [status, saved])

  useEffect(() => {
    if (status !== 'ready' || !ready) return
    const timer = window.setTimeout(() => {
      for (const [bucket, entries] of splitIntoBuckets(local)) {
        if (writing.current.has(bucket)) continue
        const record = saved.get(bucket)
        const savedEntries = record?.data.entries ?? {}
        const merged = mergeEntries(savedEntries, entries)
        if (merged === savedEntries) continue
        writing.current.add(bucket)
        const write = record ? putConfirmed(record.recordId, { entries: merged }) : createConfirmed({ bucket, entries: merged })
        // A saved write comes back as a changed record, which runs this again for anything newer. A rejected one waits for the next change.
        write.catch(() => undefined).finally(() => writing.current.delete(bucket))
      }
    }, WRITE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [status, ready, local, saved, createConfirmed, putConfirmed])

  return null
}
