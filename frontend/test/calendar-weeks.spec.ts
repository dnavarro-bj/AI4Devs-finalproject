// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { monthWeeks } from '../app/components/ui/calendarWeeks'

/**
 * El reparto de un mes en semanas, aparte del DOM.
 *
 * Aritmética de fechas nativa, sin librería: es una función pura que se testea entera, y traer
 * una dependencia por esto la ataría al proyecto para siempre.
 */
describe('monthWeeks', () => {
  it('siempre devuelve semanas completas de siete días empezando en lunes', () => {
    for (const month of ['2026-01', '2026-02', '2026-09', '2026-12']) {
      const weeks = monthWeeks(month)
      expect(weeks.every((week) => week.length === 7)).toBe(true)
      expect(weeks[0]![0]!.date.endsWith('-01') || !weeks[0]![0]!.inMonth).toBe(true)
    }
  })

  it('un mes que empieza en lunes no lleva relleno por delante', () => {
    // Junio de 2026 empieza en lunes.
    const weeks = monthWeeks('2026-06')

    expect(weeks[0]![0]).toEqual({ date: '2026-06-01', inMonth: true })
  })

  it('un mes que empieza en domingo lleva seis días de relleno por delante', () => {
    // Noviembre de 2026 empieza en domingo.
    const weeks = monthWeeks('2026-11')

    const leading = weeks[0]!.filter((day) => !day.inMonth)
    expect(leading).toHaveLength(6)
    expect(weeks[0]![6]).toEqual({ date: '2026-11-01', inMonth: true })
  })

  it('febrero de un año no bisiesto tiene 28 días en el mes', () => {
    const days = monthWeeks('2026-02').flat().filter((day) => day.inMonth)

    expect(days).toHaveLength(28)
    expect(days.at(-1)!.date).toBe('2026-02-28')
  })

  it('febrero de un año bisiesto tiene 29', () => {
    const days = monthWeeks('2028-02').flat().filter((day) => day.inMonth)

    expect(days).toHaveLength(29)
    expect(days.at(-1)!.date).toBe('2028-02-29')
  })

  it('el relleno final pertenece al mes siguiente', () => {
    const weeks = monthWeeks('2026-09')
    const last = weeks.at(-1)!.at(-1)!

    expect(last.inMonth).toBe(false)
    expect(last.date > '2026-09-30').toBe(true)
  })
})
