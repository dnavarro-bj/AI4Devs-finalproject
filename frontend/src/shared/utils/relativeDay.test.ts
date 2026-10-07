import { describe, expect, it } from 'vitest'
import { relativeDay } from './relativeDay'

describe('relativeDay', () => {
  it('dice hoy, ayer o hace N días contando días de calendario', () => {
    expect(relativeDay('2026-10-07T23:59:00Z', '2026-10-07')).toBe('hoy')
    expect(relativeDay('2026-10-06T00:01:00Z', '2026-10-07')).toBe('ayer')
    expect(relativeDay('2026-10-02T10:00:00Z', '2026-10-07')).toBe('hace 5 días')
  })

  it('un instante posterior a la fecha de referencia cuenta como hoy', () => {
    expect(relativeDay('2026-10-09T10:00:00Z', '2026-10-07')).toBe('hoy')
  })
})
