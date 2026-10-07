import { describe, expect, it } from 'vitest'
import {
  ENVIRONMENTS,
  SUN_EXPOSURE,
  emptyLevels,
  levelsToPeriods,
  monthsOf,
  periodSpan,
  periodsToLevels,
  speciesToInput,
  yearRows,
  type CalendarLevels,
} from './speciesCultivation'
import type { SpeciesDetail } from '../types/species.types'

describe('vocabularios', () => {
  it('la exposición tiene los cuatro valores, cada uno con su definición y sin cifras', () => {
    expect(SUN_EXPOSURE.map((option) => option.value)).toEqual(['sombra', 'semisombra', 'soleado', 'pleno_sol'])
    for (const option of SUN_EXPOSURE) {
      expect(option.description.length).toBeGreaterThan(10)
      expect(option.description).not.toMatch(/\d/)
    }
  })

  it('el entorno tiene tres valores y ninguno es «estacional»', () => {
    expect(ENVIRONMENTS.map((option) => option.value)).toEqual(['interior', 'exterior', 'ambos'])
  })
})

describe('monthsOf y periodSpan', () => {
  it('un periodo normal recorre del inicio al fin', () => {
    expect(monthsOf(3, 5)).toEqual([3, 4, 5])
    expect(monthsOf(6, 6)).toEqual([6])
  })

  it('noviembre a febrero cruza diciembre y es un solo periodo', () => {
    expect(monthsOf(11, 2)).toEqual([11, 12, 1, 2])
  })

  it('se lee como un rango', () => {
    expect(periodSpan(5, 7)).toBe('Mayo–julio')
    expect(periodSpan(11, 2)).toBe('Noviembre–febrero')
    expect(periodSpan(6, 6)).toBe('Junio')
  })
})

describe('yearRows', () => {
  it('cada fila declara cuántas fuerzas admite', () => {
    expect(yearRows([]).map((row) => [row.label, row.max])).toEqual([
      ['Crecimiento', 2], ['Reposo', 1], ['Floración', 1], ['Riego', 3],
    ])
  })

  it('devuelve siempre las cuatro filas, también sin periodos', () => {
    const rows = yearRows([])

    expect(rows.map((row) => row.label)).toEqual(['Crecimiento', 'Reposo', 'Floración', 'Riego'])
    for (const row of rows) expect(row.levels).toEqual(Array(12).fill(0))
  })

  it('enciende los meses de un periodo y cruza el año', () => {
    const rows = yearRows([{ type: 'reposo', startMonth: 11, endMonth: 2, intensity: null }])

    expect(rows[1]!.levels).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1])
  })

  it('el riego lleva su intensidad como nivel', () => {
    const rows = yearRows([
      { type: 'riego', startMonth: 3, endMonth: 5, intensity: 'moderado' },
      { type: 'riego', startMonth: 6, endMonth: 8, intensity: 'abundante' },
      { type: 'riego', startMonth: 11, endMonth: 12, intensity: 'escaso' },
    ])

    expect(rows[3]!.levels).toEqual([0, 0, 2, 2, 2, 3, 3, 3, 0, 0, 1, 1])
  })
})

describe('periodsToLevels', () => {
  it('el crecimiento máximo se superpone al crecimiento: dos niveles', () => {
    const { crecimiento } = periodsToLevels([
      { type: 'crecimiento', startMonth: 3, endMonth: 10, intensity: null },
      { type: 'crecimiento_maximo', startMonth: 5, endMonth: 7, intensity: null },
    ])

    expect(crecimiento).toEqual([0, 0, 1, 1, 2, 2, 2, 1, 1, 1, 0, 0])
  })

  it('el riego lleva su intensidad y el reposo cruza el año', () => {
    const levels = periodsToLevels([
      { type: 'riego', startMonth: 3, endMonth: 4, intensity: 'escaso' },
      { type: 'riego', startMonth: 5, endMonth: 5, intensity: 'abundante' },
      { type: 'reposo', startMonth: 11, endMonth: 2, intensity: null },
    ])

    expect(levels.riego).toEqual([0, 0, 1, 1, 3, 0, 0, 0, 0, 0, 0, 0])
    expect(levels.reposo).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1])
  })

  it('sin periodos, todo apagado', () => {
    expect(periodsToLevels(undefined)).toEqual(emptyLevels())
  })
})

describe('levelsToPeriods', () => {
  const levels = (patch: Partial<CalendarLevels>): CalendarLevels => ({ ...emptyLevels(), ...patch })

  it('agrupa los meses consecutivos en un periodo', () => {
    const periods = levelsToPeriods(levels({ floracion: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0] }))

    expect(periods).toEqual([{ type: 'floracion', startMonth: 5, endMonth: 7, intensity: null, notes: null }])
  })

  it('diciembre y enero seguidos son un solo periodo que cruza el año', () => {
    const periods = levelsToPeriods(levels({ reposo: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1] }))

    expect(periods).toEqual([{ type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: null }])
  })

  it('los doce meses son un periodo de 1 a 12', () => {
    const periods = levelsToPeriods(levels({ crecimiento: Array(12).fill(1) }))

    expect(periods).toEqual([{ type: 'crecimiento', startMonth: 1, endMonth: 12, intensity: null, notes: null }])
  })

  it('meses separados son periodos separados', () => {
    const periods = levelsToPeriods(levels({ floracion: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }))

    expect(periods.map((period) => [period.startMonth, period.endMonth])).toEqual([[1, 1], [3, 3]])
  })

  it('el segundo nivel de crecimiento sale como crecimiento máximo, dentro del crecimiento', () => {
    const periods = levelsToPeriods(levels({ crecimiento: [0, 0, 1, 1, 2, 2, 2, 1, 1, 1, 0, 0] }))

    expect(periods).toEqual([
      { type: 'crecimiento', startMonth: 3, endMonth: 10, intensity: null, notes: null },
      { type: 'crecimiento_maximo', startMonth: 5, endMonth: 7, intensity: null, notes: null },
    ])
  })

  it('el riego sale agrupado por intensidad', () => {
    const periods = levelsToPeriods(levels({ riego: [1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1] }))

    expect(periods.map((period) => [period.intensity, period.startMonth, period.endMonth])).toEqual([
      ['escaso', 11, 2],
      ['moderado', 3, 4],
      ['moderado', 9, 10],
      ['abundante', 5, 8],
    ])
  })

  it('ida y vuelta: lo que sale de los periodos vuelve a los mismos niveles', () => {
    const original = levels({
      crecimiento: [0, 0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 0],
      reposo: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      floracion: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      riego: [1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1],
    })

    expect(periodsToLevels(levelsToPeriods(original))).toEqual(original)
  })
})

describe('speciesToInput', () => {
  const species: SpeciesDetail = {
    id: '1', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra',
    minHumidity: 20, maxHumidity: 40, minTemperature: 8, maxTemperature: 35, minLightHours: 8, maxLightHours: 12,
    wateringGuideline: 'cada 15 días', soilMix: { id: '9', name: 'Mineral' }, plantCount: 3,
    description: 'Cactus globular', sunExposure: 'pleno_sol', environment: 'exterior',
    bloomDescription: 'tras un reposo seco', bloomColor: 'Amarillo', bloomMaturity: '15 años', bloomTypicalDuration: '3 días',
    periods: [{ id: '5', type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: null }],
  }

  it('corregir parte de todo lo guardado: un PUT sin esto lo borraría', () => {
    const input = speciesToInput(species)

    expect(input.sunExposure).toBe('pleno_sol')
    expect(input.environment).toBe('exterior')
    expect(input.description).toBe('Cactus globular')
    expect(input.bloomColor).toBe('Amarillo')
    expect(input.soilMixId).toBe('9')
    expect(input.periods).toEqual([{ type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: null }])
    expect(input.periods![0]).not.toHaveProperty('id')
  })
})
