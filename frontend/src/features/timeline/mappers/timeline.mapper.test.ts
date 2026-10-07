// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bloomDays, bloomInterval, bloomMonth, entryTitle, INTERVENTION_FIELDS, TIMELINE_KIT_TYPES, toEvent } from './timeline.mapper'
import type { TimelineEntry } from '../types/timeline.types'

const at = '2026-09-02T09:00:00Z'

describe('timeline.mapper', () => {
  it('declara los siete tipos con marca y tono', () => {
    expect(TIMELINE_KIT_TYPES.map((type) => type.value)).toEqual([
      'lectura', 'cambio_estado', 'movimiento', 'comentario', 'intervencion', 'floracion', 'tarea',
    ])
    expect(TIMELINE_KIT_TYPES.every((type) => type.mark && type.tone)).toBe(true)
  })

  it('titula cada tipo con lo que dice su detalle', () => {
    const entries: [TimelineEntry, string][] = [
      [{ id: '1', type: 'lectura', occurredAt: at, reading: { id: '1', plantId: '1', recordedAt: at, humidity: 4, temperature: 20 } }, '2 medidas registradas'],
      [{ id: '2', type: 'cambio_estado', occurredAt: at, statusChange: { from: 'activa', to: 'cuarentena' } }, 'Activa → En cuarentena'],
      [{ id: '3', type: 'movimiento', occurredAt: at, movement: { from: { id: '1', name: 'A' }, to: { id: '2', name: 'Bandeja A3' } } }, 'Traslado a Bandeja A3'],
      [{ id: '4', type: 'comentario', occurredAt: at, comment: { text: 'x' } }, 'Comentario'],
      [{ id: '5', type: 'intervencion', occurredAt: at, intervention: { type: 'fertilizacion' } }, 'Fertilización'],
      [{ id: '6', type: 'floracion', occurredAt: at, bloom: { startedOn: '2026-05-22', status: 'finalizada', endedOn: '2026-05-25' } }, 'Finalizada'],
      [{ id: '7', type: 'tarea', occurredAt: at, task: { taskId: '9', type: 'riego', title: 'Regar la bandeja A3' } }, 'Tarea completada'],
    ]
    for (const [entry, title] of entries) expect(entryTitle(entry)).toBe(title)
  })

  it('una tarea sin detalle sigue titulándose como tarea completada', () => {
    expect(entryTitle({ id: '8', type: 'tarea', occurredAt: at })).toBe('Tarea completada')
  })

  it('un tipo desconocido se conserva con su valor crudo como título', () => {
    const event = toEvent({ id: '9', type: 'alerta', occurredAt: at })

    expect(event).toMatchObject({ id: '9', type: 'alerta', title: 'alerta', at })
  })

  it('el intervalo de una floración cuenta el primer y el último día', () => {
    expect(bloomDays({ startedOn: '2026-05-22', endedOn: '2026-05-25', status: 'finalizada' })).toBe(4)
    expect(bloomInterval({ startedOn: '2026-05-22', endedOn: '2026-05-25', status: 'finalizada' })).toContain('4 días')
  })

  it('una floración abierta dice que sigue en curso y no tiene duración', () => {
    const bloom = { startedOn: '2026-05-22', status: 'en_flor' as const }

    expect(bloomDays(bloom)).toBeNull()
    expect(bloomInterval(bloom)).toContain('en curso')
  })

  it('el mes de la floración va con mayúscula inicial', () => {
    expect(bloomMonth({ startedOn: '2026-05-22', status: 'en_flor' })).toBe('Mayo de 2026')
  })

  it('cada intervención admite solo sus datos', () => {
    expect(INTERVENTION_FIELDS.trasplante).toEqual({ potSize: true, soilMix: false, product: false })
    expect(INTERVENTION_FIELDS.sustrato.soilMix).toBe(true)
    expect(INTERVENTION_FIELDS.tratamiento.product).toBe(true)
    expect(INTERVENTION_FIELDS.fertilizacion.product).toBe(true)
    expect(INTERVENTION_FIELDS.poda).toEqual({ potSize: false, soilMix: false, product: false })
  })
})
