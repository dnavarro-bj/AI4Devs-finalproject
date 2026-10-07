import { describe, expect, it } from 'vitest'
import {
  agendaDue,
  calendarEntries,
  monthRange,
  overdueText,
  periodText,
  priorityLevel,
  targetText,
  taskTiming,
} from './task.mapper'
import type { Task } from '../types/task.types'

const task = (patch: Partial<Task> = {}): Task => ({
  id: 't1', type: 'riego', title: 'Regar', priority: 'normal', status: 'pendiente',
  dueFrom: '2026-10-07', dueTo: '2026-10-07', origin: 'manual',
  target: { kind: 'location', location: { id: '1', name: 'Invernadero 1', path: 'Invernadero 1' } },
  createdAt: '', updatedAt: '', ...patch,
})

const TODAY = '2026-10-07'

describe('destino', () => {
  it('una localización se dice con su ruta; las plantas, con su número', () => {
    expect(targetText(task())).toBe('Invernadero 1')
    expect(targetText(task({ target: { kind: 'plants', plantCount: 1 } }))).toBe('1 planta')
    expect(targetText(task({ target: { kind: 'plants', plantCount: 31 } }))).toBe('31 plantas')
  })
})

describe('periodo', () => {
  it('un día exacto y un periodo se dicen distinto', () => {
    expect(periodText(task({ dueFrom: '2026-10-07', dueTo: '2026-10-07' }))).toBe('7 oct')
    expect(periodText(task({ dueFrom: '2026-10-07', dueTo: '2026-10-09' }))).toBe('7 oct – 9 oct')
  })
})

describe('agendaDue: dónde cae una tarea en la agenda', () => {
  it('un periodo que contiene hoy cae en hoy', () => {
    expect(agendaDue(task({ dueFrom: '2026-10-05', dueTo: '2026-10-09' }), TODAY)).toBe(TODAY)
  })

  it('lo que terminó antes de hoy cae en su fin, vencido', () => {
    expect(agendaDue(task({ dueFrom: '2026-10-01', dueTo: '2026-10-03' }), TODAY)).toBe('2026-10-03')
  })

  it('lo que aún no ha empezado cae en su inicio', () => {
    expect(agendaDue(task({ dueFrom: '2026-10-10', dueTo: '2026-10-14' }), TODAY)).toBe('2026-10-10')
  })
})

describe('cuándo es: la agenda lo cuenta con el periodo y cuánto hace que venció', () => {
  it('hoy', () => {
    expect(taskTiming(task(), TODAY)).toEqual({ main: '7 oct', hint: 'Hoy' })
  })

  it('un periodo en curso también es hoy', () => {
    expect(taskTiming(task({ dueFrom: '2026-10-05', dueTo: '2026-10-09' }), TODAY).hint).toBe('Hoy')
  })

  it('vencida, cuántos días hace', () => {
    expect(taskTiming(task({ dueFrom: '2026-10-04', dueTo: '2026-10-04' }), TODAY).hint).toBe('Hace 3 días')
    expect(overdueText('2026-10-06', TODAY)).toBe('Hace 1 día')
  })

  it('futura, sin pista', () => {
    expect(taskTiming(task({ dueFrom: '2026-10-20', dueTo: '2026-10-20' }), TODAY).hint).toBe('')
  })

  it('no vencida es null', () => {
    expect(overdueText('2026-10-07', TODAY)).toBeNull()
  })
})

describe('prioridad', () => {
  it('se traduce al nivel del kit', () => {
    expect(priorityLevel('alta')).toBe('immediate')
    expect(priorityLevel('normal')).toBe('soon')
    expect(priorityLevel('baja')).toBe('routine')
  })
})

describe('calendario', () => {
  it('el rango del mes pedido al API', () => {
    expect(monthRange('2026-10')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('una tarea con periodo aparece en cada día suyo del mes', () => {
    const entries = calendarEntries([task({ dueFrom: '2026-10-07', dueTo: '2026-10-09' })], '2026-10', TODAY)

    expect(entries.map((entry) => entry.date)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09'])
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(3)
  })

  it('recorta el periodo al mes visible', () => {
    const entries = calendarEntries([task({ dueFrom: '2026-09-29', dueTo: '2026-10-02' })], '2026-10', TODAY)

    expect(entries.map((entry) => entry.date)).toEqual(['2026-10-01', '2026-10-02'])
  })

  it('lo vencido va en tono de peligro y el resto neutro', () => {
    const [overdue] = calendarEntries([task({ dueFrom: '2026-10-02', dueTo: '2026-10-02' })], '2026-10', TODAY)
    const [future] = calendarEntries([task({ dueFrom: '2026-10-20', dueTo: '2026-10-20' })], '2026-10', TODAY)

    expect(overdue!.tone).toBe('danger')
    expect(future!.tone).toBe('neutral')
  })
})
