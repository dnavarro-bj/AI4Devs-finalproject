import { describe, expect, it } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  it('el singular solo para uno', () => {
    expect(plural(1, 'planta', 'plantas')).toBe('1 planta')
    expect(plural(0, 'planta', 'plantas')).toBe('0 plantas')
    expect(plural(31, 'planta', 'plantas')).toBe('31 plantas')
  })
})
