import { describe, expect, it } from 'vitest'
import { bucketOf, mergeEntries, splitIntoBuckets, validEntries, type Entries } from './user-data'

describe('mergeEntries', () => {
  it('keeps the newer entry for each key', () => {
    const base: Entries = { 'found:bank-001': [10, true], 'fav:bank-001': [30, true] }
    const other: Entries = { 'found:bank-001': [20, null], 'fav:bank-001': [5, null], 'note:bank-002': [1, 'hi'] }
    expect(mergeEntries(base, other)).toEqual({ 'found:bank-001': [20, null], 'fav:bank-001': [30, true], 'note:bank-002': [1, 'hi'] })
  })

  it('returns the same object when the other copy adds nothing', () => {
    const base: Entries = { 'found:bank-001': [10, true] }
    expect(mergeEntries(base, { 'found:bank-001': [10, true] })).toBe(base)
    expect(mergeEntries(base, { 'found:bank-001': [9, null] })).toBe(base)
  })

  it('gives the same result whichever copy merges first', () => {
    const one: Entries = { 'note:bank-001': [10, 'left door'] }
    const two: Entries = { 'note:bank-001': [10, 'right door'] }
    expect(mergeEntries(one, two)).toEqual(mergeEntries(two, one))
  })
})

describe('buckets', () => {
  it('groups pin entries by kind of place and markers together', () => {
    expect(bucketOf('found:bank-001')).toBe('bank')
    expect(bucketOf('note:convenience-store-014')).toBe('convenience-store')
    expect(bucketOf('marker:3f2a-9c')).toBe('markers')
    const buckets = splitIntoBuckets({ 'found:bank-001': [1, true], 'fav:bank-002': [1, true], 'marker:a': [1, null] })
    expect([...buckets.keys()].sort()).toEqual(['bank', 'markers'])
    expect(Object.keys(buckets.get('bank')!)).toEqual(['found:bank-001', 'fav:bank-002'])
  })
})

describe('validEntries', () => {
  it('keeps well-formed entries and ignores everything else', () => {
    expect(validEntries({ 'found:bank-001': [10, true], broken: 'yes', short: [1], 'fav:bank-002': ['late', true] })).toEqual({ 'found:bank-001': [10, true] })
  })

  it('treats anything that is not a map of entries as empty', () => {
    for (const source of [null, 'text', 42, ['found:bank-001']]) expect(validEntries(source)).toEqual({})
  })
})
