import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, fail } from '@shared/types/api.types'
import type { TimelineEntry } from '../types/timeline.types'

const service = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('../services/timeline.api.service', () => ({ timelineApiService: service }))

import { usePlantTimeline } from './usePlantTimeline'

const entry = (id: string, type: string, occurredAt: string, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
  ({ id, type, occurredAt, ...extra })

const page = (content: TimelineEntry[], over: Record<string, number> = {}) =>
  ok({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25, ...over })

describe('usePlantTimeline', () => {
  beforeEach(() => Object.values(service).forEach((fn) => fn.mockReset()))

  it('carga la primera página sin filtro', async () => {
    service.list.mockResolvedValue(page([entry('1', 'comentario', '2026-09-01T00:00:00Z')]))
    const timeline = usePlantTimeline('7')

    await timeline.load()

    expect(service.list).toHaveBeenCalledWith('7', { types: [], page: 0, size: 10 })
    expect(timeline.entries.value).toHaveLength(1)
    expect(timeline.total.value).toBe(1)
    expect(timeline.hasMore.value).toBe(false)
  })

  it('filtrar pide al servidor el tipo y vuelve a la primera página', async () => {
    service.list.mockResolvedValue(page([]))
    const timeline = usePlantTimeline('7')
    await timeline.load()

    await timeline.setFilter('floracion')

    expect(service.list).toHaveBeenLastCalledWith('7', { types: ['floracion'], page: 0, size: 10 })
    expect(timeline.filter.value).toBe('floracion')
  })

  it('cargar más pide la página siguiente con el mismo filtro y no repite eventos', async () => {
    service.list
      .mockResolvedValueOnce(page([entry('3', 'floracion', '2026-09-03T00:00:00Z'), entry('2', 'floracion', '2026-09-02T00:00:00Z')], { totalElements: 3, totalPages: 2 }))
      .mockResolvedValueOnce(page([entry('2', 'floracion', '2026-09-02T00:00:00Z'), entry('1', 'floracion', '2026-09-01T00:00:00Z')], { totalElements: 3, totalPages: 2, pageNumber: 1 }))
    const timeline = usePlantTimeline('7')
    await timeline.setFilter('floracion')
    expect(timeline.hasMore.value).toBe(true)

    await timeline.loadMore()

    expect(service.list).toHaveBeenLastCalledWith('7', { types: ['floracion'], page: 1, size: 10 })
    expect(timeline.entries.value.map((e) => e.id)).toEqual(['3', '2', '1'])
    expect(timeline.hasMore.value).toBe(false)
  })

  it('un fallo al cargar queda como error y no lanza', async () => {
    service.list.mockResolvedValue(fail({ code: 'NETWORK_ERROR', message: 'Sin conexión' }))
    const timeline = usePlantTimeline('7')

    await timeline.load()

    expect(timeline.error.value).toBe('Sin conexión')
    expect(timeline.loading.value).toBe(false)
  })

  it('un evento nuevo entra en su sitio por instante y suma al recuento', async () => {
    service.list.mockResolvedValue(page([entry('3', 'comentario', '2026-09-03T00:00:00Z'), entry('1', 'comentario', '2026-09-01T00:00:00Z')]))
    service.create.mockResolvedValue(ok(entry('2', 'comentario', '2026-09-02T00:00:00Z', { comment: { text: 'x' } })))
    const timeline = usePlantTimeline('7')
    await timeline.load()

    const result = await timeline.save('comments', { text: 'x' })

    expect(result.success).toBe(true)
    expect(timeline.entries.value.map((e) => e.id)).toEqual(['3', '2', '1'])
    expect(timeline.total.value).toBe(3)
  })

  it('con un filtro activo, un evento de otro tipo no se cuela', async () => {
    service.list.mockResolvedValue(page([entry('1', 'floracion', '2026-09-01T00:00:00Z')]))
    service.create.mockResolvedValue(ok(entry('2', 'comentario', '2026-09-02T00:00:00Z')))
    const timeline = usePlantTimeline('7')
    await timeline.setFilter('floracion')

    await timeline.save('comments', { text: 'x' })

    expect(timeline.entries.value.map((e) => e.id)).toEqual(['1'])
    expect(timeline.total.value).toBe(1)
  })

  it('corregir reemplaza la entrada y retirar la quita ajustando el recuento', async () => {
    service.list.mockResolvedValue(page([entry('2', 'comentario', '2026-09-02T00:00:00Z', { comment: { text: 'a' } }), entry('1', 'comentario', '2026-09-01T00:00:00Z')]))
    service.update.mockResolvedValue(ok(entry('2', 'comentario', '2026-09-02T00:00:00Z', { comment: { text: 'b', editedAt: '2026-09-05T00:00:00Z' } })))
    service.remove.mockResolvedValue(ok(null))
    const timeline = usePlantTimeline('7')
    await timeline.load()

    await timeline.save('comments', { text: 'b' }, '2')
    expect(service.update).toHaveBeenCalledWith('7', 'comments', '2', { text: 'b' })
    expect(timeline.entries.value[0]!.comment!.text).toBe('b')

    await timeline.remove('comments', '1')
    expect(timeline.entries.value.map((e) => e.id)).toEqual(['2'])
    expect(timeline.total.value).toBe(1)
  })

  it('un guardado rechazado no toca la lista y devuelve el error', async () => {
    service.list.mockResolvedValue(page([entry('1', 'comentario', '2026-09-01T00:00:00Z')]))
    service.create.mockResolvedValue(fail({ code: 'VALIDATION_ERROR', message: 'Fecha futura' }))
    const timeline = usePlantTimeline('7')
    await timeline.load()

    const result = await timeline.save('comments', { text: 'x' })

    expect(result.error!.message).toBe('Fecha futura')
    expect(timeline.entries.value).toHaveLength(1)
  })

  it('recargar mantiene el filtro y no parpadea con el estado de carga', async () => {
    service.list.mockResolvedValue(page([]))
    const timeline = usePlantTimeline('7')
    await timeline.setFilter('lectura')

    const pending = timeline.reload()
    expect(timeline.loading.value).toBe(false)
    await pending

    expect(service.list).toHaveBeenLastCalledWith('7', { types: ['lectura'], page: 0, size: 10 })
  })
})
