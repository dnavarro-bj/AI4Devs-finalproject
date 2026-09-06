// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { toTimelineEvents } from './usePlantHistory'
import type { CareRecord } from '../types/careRecord.types'

/**
 * La traducción de lecturas a eventos de cronología.
 *
 * `UiTimeline` no conoce los tipos del producto (T-12), así que traducir es trabajo de la feature.
 * Y es función pura: se prueba sin montar nada.
 */

const record = (id: string, recordedAt: string, values: Partial<CareRecord> = {}): CareRecord => ({
  id,
  plantId: '1',
  recordedAt,
  ...values,
})

describe('toTimelineEvents', () => {
  it('convierte cada lectura en un evento con su fecha', () => {
    const events = toTimelineEvents([record('a', '2026-09-06T10:00:00Z', { humidity: 27 })])

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ id: 'a', type: 'reading', at: '2026-09-06T10:00:00Z' })
  })

  it('conserva el orden descendente que garantiza el API', () => {
    const events = toTimelineEvents([
      record('nueva', '2026-09-06T10:00:00Z'),
      record('vieja', '2026-09-02T10:00:00Z'),
    ])

    expect(events.map((event) => event.id)).toEqual(['nueva', 'vieja'])
  })

  it('muestra las cinco magnitudes, marcando las ausentes: dos lecturas se comparan columna a columna', () => {
    const events = toTimelineEvents([record('a', '2026-09-06T10:00:00Z', { humidity: 27, soilPh: 6.2 })])

    expect(events[0]!.values.map((value) => value.label))
      .toEqual(['Humedad', 'Temperatura', 'Luz', 'Riego', 'Acidez'])
    expect(events[0]!.values.map((value) => value.text))
      .toEqual(['27 %', '—', '—', '—', '6,2 pH'])
  })

  it('una magnitud ausente se marca como tal, y no como un cero', () => {
    const events = toTimelineEvents([record('a', '2026-09-06T10:00:00Z', { humidity: 27 })])

    const temperature = events[0]!.values.find((value) => value.label === 'Temperatura')!
    expect(temperature.absent).toBe(true)
    expect(temperature.text).not.toContain('0')
  })

  it('un cero informado es un dato, no una ausencia', () => {
    const events = toTimelineEvents([record('a', '2026-09-06T10:00:00Z', { waterAmountMl: 0 })])

    const water = events[0]!.values.find((value) => value.label === 'Riego')!
    expect(water.absent).toBe(false)
    expect(water.text).toBe('0 ml')
  })

  it('una lectura con los cinco valores los muestra todos, en orden fijo', () => {
    const events = toTimelineEvents([
      record('a', '2026-09-06T10:00:00Z', {
        humidity: 30, temperature: 24, lightHours: 10, waterAmountMl: 450, soilPh: 6.2,
      }),
    ])

    expect(events[0]!.values.map((value) => value.label))
      .toEqual(['Humedad', 'Temperatura', 'Luz', 'Riego', 'Acidez'])
  })

  it('sin lecturas no hay eventos', () => {
    expect(toTimelineEvents([])).toEqual([])
  })

  it('el título dice cuántas medidas trae, para distinguir una lectura completa de una suelta', () => {
    const one = toTimelineEvents([record('a', '2026-09-06T10:00:00Z', { humidity: 27 })])
    const many = toTimelineEvents([record('b', '2026-09-06T10:00:00Z', { humidity: 27, temperature: 24 })])

    // El recuento es de las **informadas**, aunque se pinten las cinco.
    expect(one[0]!.title).toContain('1 medida')
    expect(many[0]!.title).toContain('2 medidas')
  })
})
