// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { plantGlance } from './plantGlance'
import type { Task } from '@features/tasks/types/task.types'
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

  it('ninguna magnitud es de ejemplo: la próxima tarea también es real', () => {
    const items = plantGlance([], NOW, null, { task: null, today: '2026-09-06' })

    for (const item of items) expect(item.mock).toBeFalsy()
  })

  describe('próxima tarea', () => {
    const task = (patch: Partial<Task> = {}): Task => ({
      id: 't1', type: 'riego', title: 'Regar la bandeja A3', priority: 'normal', status: 'pendiente',
      dueFrom: '2026-09-10', dueTo: '2026-09-10', origin: 'manual',
      target: { kind: 'location', location: { id: '1', name: 'A3', path: 'A3' } },
      createdAt: '', updatedAt: '', ...patch,
    })

    it('dice el título y cuándo es', () => {
      const next = find(plantGlance([], NOW, null, { task: task(), today: '2026-09-06' }), 'Próxima tarea')

      expect(next.value).toBe('Regar la bandeja A3')
      expect(next.note).toBe('10 sept')
    })

    it('una tarea de hoy o de un periodo en curso es «Hoy»', () => {
      const next = find(plantGlance([], NOW, null, { task: task({ dueFrom: '2026-09-05', dueTo: '2026-09-08' }), today: '2026-09-06' }), 'Próxima tarea')

      expect(next.note).toBe('Hoy')
    })

    it('una vencida se lee como vencida, con cuánto hace', () => {
      const next = find(plantGlance([], NOW, null, { task: task({ dueFrom: '2026-09-04', dueTo: '2026-09-04' }), today: '2026-09-06' }), 'Próxima tarea')

      expect(next.note).toBe('Vencida · Hace 2 días')
    })

    it('sin trabajo pendiente lo dice, y sin consultar no inventa nada', () => {
      expect(find(plantGlance([], NOW, null, { task: null, today: '2026-09-06' }), 'Próxima tarea')).toMatchObject({ value: '—', note: 'Sin trabajo pendiente' })
      expect(find(plantGlance([], NOW), 'Próxima tarea')).toMatchObject({ value: '—', note: 'Sin consultar' })
    })
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
