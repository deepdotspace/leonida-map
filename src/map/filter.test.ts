import { describe, expect, it } from 'vitest'
import { mustSee } from './collections'
import { visiblePins } from './filter'
import { pins, pinsByCategory } from './pins'

const nothingFound = new Set<string>()
const banks = pinsByCategory.get('bank')!

describe('visiblePins', () => {
  it('shows the pins of the switched-on categories', () => {
    const shown = visiblePins({ enabledCategories: new Set(['bank']), focus: null, hideFound: false, found: nothingFound })
    expect(shown).toEqual(banks)
  })

  it('shows only the focused category or collection, whatever is switched on', () => {
    const everything = new Set(pins.map((pin) => pin.category))
    expect(visiblePins({ enabledCategories: everything, focus: { kind: 'category', id: 'bank' }, hideFound: false, found: nothingFound })).toEqual(banks)
    expect(visiblePins({ enabledCategories: new Set(), focus: { kind: 'collection', id: 'must-see' }, hideFound: false, found: nothingFound })).toEqual(mustSee.pins)
  })

  it('leaves out found pins when they are hidden', () => {
    const found = new Set([banks[0].id])
    const shown = visiblePins({ enabledCategories: new Set(['bank']), focus: null, hideFound: true, found })
    expect(shown).toHaveLength(banks.length - 1)
    expect(shown).not.toContain(banks[0])
  })
})
