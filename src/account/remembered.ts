/**
 * Remembers in this browser that the visitor uses an account, so the map
 * loads the sign-in and sync code only for them. Everyone else gets the
 * plain static page with no session check.
 */

import { readStored, writeStored } from '@/lib/storage'

const KEY = 'leonida-map:account'

export function usesAccount(): boolean {
  return readStored(KEY) === '1'
}

export function rememberAccount(inUse: boolean) {
  writeStored(KEY, inUse ? '1' : null)
}
