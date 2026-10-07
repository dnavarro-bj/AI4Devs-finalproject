import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '../types/activity.types'
import { activityLine } from './activity.mapper'

const TODAY = '2026-10-07'
const base = { id: '1', occurredAt: '2026-10-07T09:00:00Z' }

describe('activityLine', () => {
  it('un lote es una sola línea con su acción y el número de plantas', () => {
    const entry: ActivityEntry = { ...base, type: 'lote', batch: { id: '9', action: 'lectura', plantCount: 31 } }

    expect(activityLine(entry, TODAY)).toMatchObject({ title: 'Lectura en 31 plantas', trailing: 'hoy' })
    expect(activityLine({ ...entry, batch: { id: '9', action: 'intervencion', plantCount: 12 } }, TODAY).title)
      .toBe('Intervención en 12 plantas')
    expect(activityLine({ ...entry, batch: { id: '9', action: 'comentario', plantCount: 4 } }, TODAY).title)
      .toBe('Comentario en 4 plantas')
  })

  it('un lote de una planta lo dice en singular', () => {
    const entry: ActivityEntry = { ...base, type: 'lote', batch: { id: '9', action: 'lectura', plantCount: 1 } }

    expect(activityLine(entry, TODAY).title).toBe('Lectura en 1 planta')
  })

  it('una tarea completada dice su título y las plantas que afectó', () => {
    const entry: ActivityEntry = { ...base, type: 'tarea', task: { id: '3', type: 'riego', title: 'Regar bandejas', affectedPlants: 6 } }

    expect(activityLine(entry, TODAY)).toMatchObject({ title: 'Regar bandejas', detail: 'Tarea completada · 6 plantas' })
  })

  it('un comentario lleva el código de la planta, enlazado a su ficha, y el comienzo del texto', () => {
    const entry: ActivityEntry = {
      ...base, type: 'comentario', plant: { id: '5', code: 'CAT-GRUSS-01', nickname: 'Con ficha' }, comment: { excerpt: 'Marca en el lado oeste' },
    }

    expect(activityLine(entry, TODAY)).toMatchObject({
      title: 'CAT-GRUSS-01', detail: 'Comentario · Marca en el lado oeste', to: '/plants/5',
    })
  })

  it('una intervención dice su tipo en palabras', () => {
    const entry: ActivityEntry = {
      ...base, type: 'intervencion', plant: { id: '5', code: 'CAT-GRUSS-01', nickname: 'Con ficha' }, intervention: { type: 'poda' },
    }

    expect(activityLine(entry, TODAY)).toMatchObject({ title: 'CAT-GRUSS-01', detail: 'Intervención · Poda', to: '/plants/5' })
  })

  it('cuenta los días con la fecha de referencia y no con el reloj', () => {
    const entry: ActivityEntry = { ...base, type: 'lote', occurredAt: '2026-10-04T09:00:00Z', batch: { id: '9', action: 'lectura', plantCount: 2 } }

    expect(activityLine(entry, TODAY).trailing).toBe('hace 3 días')
  })

  it('un tipo que no conoce se muestra con su valor crudo en vez de descartarse', () => {
    const entry: ActivityEntry = { ...base, type: 'floracion' }

    expect(activityLine(entry, TODAY)).toMatchObject({ title: 'floracion', trailing: 'hoy' })
  })

  it('un comentario sin planta ni texto no rompe la línea', () => {
    const line = activityLine({ ...base, type: 'comentario' }, TODAY)

    expect(line.title).toBe('Comentario')
    expect(line.to).toBeUndefined()
  })
})
