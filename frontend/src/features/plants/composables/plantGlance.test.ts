// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { plantGlance } from './plantGlance'
import type { CareRecord } from '@features/care-records/types/careRecord.types'

/**
 * El resumen «de un vistazo».
 *
 * **`now` entra por parámetro**, como en la agenda y como el `Clock` del backend (ADR-010): «hace
 * 18 días» es una comparación, y un test que dependiera de qué día se ejecuta fallaría solo
 * algunos días.
 */
const NOW = '2026-09-06T12:00:00Z'

const record = (recordedAt: string, values: Partial<CareRecord> = {}): CareRecord => ({
  id: recordedAt,
  plantId: '1',
  recordedAt,
  ...values,
})

const find = (items: ReturnType<typeof plantGlance>, label: string) =>
  items.find((item) => item.label === label)!

describe('plantGlance', () => {
  it('el último riego sale de la última lectura que llevaba agua', () => {
    const items = plantGlance([
      record('2026-09-05T10:00:00Z', { humidity: 31 }),
      record('2026-08-19T08:00:00Z', { waterAmountMl: 450 }),
    ], NOW)

    const watering = find(items, 'Último riego')
    expect(watering.value).toContain('450 ml')
    expect(watering.note).toBe('Hace 18 días')
  })

  it('la última medición junta las magnitudes informadas en una línea', () => {
    const items = plantGlance([record('2026-09-05T10:00:00Z', { temperature: 24, humidity: 31 })], NOW)

    // Compacta y comparable, no una cifra suelta.
    expect(find(items, 'Última medición').value).toBe('24 °C · 31 %')
  })

  it('sin riegos registrados lo dice, y no inventa un cero', () => {
    const items = plantGlance([record('2026-09-05T10:00:00Z', { humidity: 31 })], NOW)

    const watering = find(items, 'Último riego')
    expect(watering.value).toBe('—')
    expect(watering.note).toBe('Sin riegos registrados')
  })

  it('sin ninguna lectura las dos magnitudes reales quedan vacías', () => {
    const items = plantGlance([], NOW)

    expect(find(items, 'Última medición').value).toBe('—')
    expect(find(items, 'Último riego').value).toBe('—')
  })

  it('hoy es «hoy», no «hace 0 días»', () => {
    const items = plantGlance([record('2026-09-06T08:00:00Z', { waterAmountMl: 200 })], NOW)

    expect(find(items, 'Último riego').note).toBe('Hoy')
  })

  it('ayer es «ayer», en singular', () => {
    const items = plantGlance([record('2026-09-05T08:00:00Z', { waterAmountMl: 200 })], NOW)

    expect(find(items, 'Último riego').note).toBe('Ayer')
  })

  it('marca como ejemplo solo la próxima tarea: la última floración es real', () => {
    const items = plantGlance([], NOW, null)

    expect(find(items, 'Próxima tarea').mock).toBe(true)
    expect(find(items, 'Última floración').mock).toBeFalsy()
    expect(find(items, 'Última medición').mock).toBeFalsy()
  })

  it('la última floración dice su mes y cuánto duró', () => {
    const items = plantGlance([], NOW, { startedOn: '2026-05-22', endedOn: '2026-05-25', status: 'finalizada' })

    const bloom = find(items, 'Última floración')
    expect(bloom.value).toBe('Mayo de 2026')
    expect(bloom.note).toBe('Duró 4 días')
  })

  it('una floración abierta se dice en curso', () => {
    const items = plantGlance([], NOW, { startedOn: '2026-09-01', status: 'en_flor' })

    expect(find(items, 'Última floración').note).toBe('En curso')
  })

  it('un ejemplar que nunca ha florecido lo dice, y sin consultar no inventa nada', () => {
    expect(find(plantGlance([], NOW, null), 'Última floración').note).toBe('Sin floraciones registradas')
    expect(find(plantGlance([], NOW), 'Última floración').value).toBe('—')
  })

  it('devuelve las cuatro magnitudes del wireframe, en su orden', () => {
    expect(plantGlance([], NOW).map((item) => item.label)).toEqual([
      'Último riego', 'Próxima tarea', 'Última medición', 'Última floración',
    ])
  })
})
