import { describe, expect, it } from 'vitest'
import { pins } from './pins'

describe('pin data', () => {
  it('credits nobody by email address', () => {
    const email = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i
    expect(pins.filter((pin) => email.test(`${pin.foundBy ?? ''} ${pin.addedBy ?? ''}`)).map((pin) => pin.id)).toEqual([])
  })
})
