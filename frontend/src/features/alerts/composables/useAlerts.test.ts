import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ok, fail } from '@shared/types/api.types'
import type { Alert } from '../types/alert.types'

const service = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), create: vi.fn(), transition: vi.fn() }))
vi.mock('../services/alerts.api.service', () => ({ alertsApiService: service }))
const locations = vi.hoisted(() => ({ loadAll: vi.fn() }))
vi.mock('@features/locations/composables/useLocations', () => ({ useLocations: () => locations }))

import { useAlerts } from './useAlerts'

const alert = (id: string, extra: Partial<Alert> = {}): Alert => ({
  id, source: 'medicion', category: 'temperatura', severity: 'media', status: 'nueva', reason: 'Fuera de rango',
  detectedAt: '2026-10-06T00:00:00Z', lastDetectedAt: '2026-10-06T00:00:00Z', occurrences: 1, ...extra,
})

const page = (content: Alert[], over: Record<string, number> = {}) =>
  ok({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 20, ...over })

describe('useAlerts', () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset())
    locations.loadAll.mockReset()
  })

  it('por defecto pide las abiertas y el recuento es el del servidor', async () => {
    service.list.mockResolvedValue(page([alert('1'), alert('2')], { totalElements: 7, totalPages: 1 }))
    const alerts = useAlerts()

    await alerts.load()

    expect(service.list).toHaveBeenCalledTimes(1)
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({
      page: 0, size: 20, status: ['nueva', 'revisada'], severity: [],
    }))
    expect(alerts.alerts.value).toHaveLength(2)
    expect(alerts.openTotal.value).toBe(7)
    expect(alerts.loading.value).toBe(false)
  })

  it('filtrar viaja al servidor y la cabecera sigue contando lo abierto', async () => {
    service.list
      .mockResolvedValueOnce(page([alert('1')], { totalElements: 5 }))
      .mockResolvedValueOnce(page([alert('9', { severity: 'critica' })], { totalElements: 1 }))
      .mockResolvedValueOnce(page([], { totalElements: 5 }))
    const alerts = useAlerts()
    await alerts.load()

    alerts.filters.severity = 'critica'
    alerts.filters.source = 'medicion'
    await vi.waitFor(() => expect(alerts.total.value).toBe(1))

    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ severity: ['critica'], source: 'medicion' }))
    expect(alerts.openTotal.value).toBe(5)
  })

  it('«todas» no manda ningún estado y uno concreto manda ese', async () => {
    service.list.mockResolvedValue(page([]))
    const alerts = useAlerts()
    await alerts.load()

    alerts.filters.state = 'all'
    await vi.waitFor(() => expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ status: [], size: 20 })))

    alerts.filters.state = 'resuelta'
    await vi.waitFor(() => expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ status: ['resuelta'] })))
  })

  it('una localización viaja con sus descendientes', async () => {
    service.list.mockResolvedValue(page([]))
    const alerts = useAlerts({ location: '9' })

    await alerts.load()

    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ location: '9', includeDescendants: true }))
  })

  it('una planta fijada desde fuera se pide siempre', async () => {
    service.list.mockResolvedValue(page([]))
    const alerts = useAlerts({ plant: '5' })

    await alerts.load()

    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ plant: '5' }))
  })

  it('cargar más pide la página siguiente con los mismos filtros y no repite alertas', async () => {
    service.list
      .mockResolvedValueOnce(page([alert('3'), alert('2')], { totalElements: 3, totalPages: 2 }))
      .mockResolvedValueOnce(page([alert('2'), alert('1')], { totalElements: 3, totalPages: 2, pageNumber: 1 }))
    const alerts = useAlerts()
    await alerts.load()
    expect(alerts.hasMore.value).toBe(true)

    await alerts.loadMore()

    expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: ['nueva', 'revisada'] }))
    expect(alerts.alerts.value.map((a) => a.id)).toEqual(['3', '2', '1'])
    expect(alerts.hasMore.value).toBe(false)
  })

  it('un error se dice y se puede reintentar', async () => {
    service.list.mockResolvedValueOnce(fail({ code: 'SERVER_ERROR', message: 'Sin conexión' }))
    const alerts = useAlerts()

    await alerts.load()

    expect(alerts.error.value).toBe('Sin conexión')
    service.list.mockResolvedValueOnce(page([alert('1')]))
    await alerts.load()
    expect(alerts.error.value).toBeNull()
    expect(alerts.alerts.value).toHaveLength(1)
  })

  it('recargar tras una transición conserva la lista hasta que llega la nueva', async () => {
    service.list.mockResolvedValue(page([alert('1')]))
    const alerts = useAlerts()
    await alerts.load()

    const pending = alerts.reload()
    await nextTick()
    expect(alerts.loading.value).toBe(false)
    expect(alerts.alerts.value).toHaveLength(1)
    await pending
  })

  it('las localizaciones se piden una vez para el filtro', async () => {
    locations.loadAll.mockResolvedValue(ok([{ id: '9', name: 'Bancada', path: 'Invernadero 1 / Bancada' }]))
    const alerts = useAlerts()

    await alerts.loadLocations()
    await alerts.loadLocations()

    expect(locations.loadAll).toHaveBeenCalledTimes(1)
    expect(alerts.locationOptions.value).toEqual([
      { value: '', label: 'Todas las localizaciones' },
      { value: '9', label: 'Invernadero 1 / Bancada' },
    ])
  })

  it('ofrece los cinco orígenes como opciones', () => {
    expect(useAlerts().sourceOptions.map((o) => o.value)).toEqual([
      '', 'medicion', 'sin_revisar', 'cuidado_vencido', 'manual', 'recomendacion_ia',
    ])
  })
})
