import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { alertsApiService } from './alerts.api.service'

const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
mockNuxtImport('getApiClient', () => () => api)

const page = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 }

describe('alertsApiService', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  it('repite estado y severidad y manda página, tamaño y orden', async () => {
    api.get.mockResolvedValue(page)

    const result = await alertsApiService.list({
      status: ['nueva', 'revisada'], severity: ['critica'], page: 2, size: 10, sort: 'lastDetected,desc',
    })

    expect(api.get).toHaveBeenCalledWith('/alerts', {
      page: 2, size: 10, sort: 'lastDetected,desc', status: ['nueva', 'revisada'], severity: ['critica'],
    })
    expect(result.success).toBe(true)
  })

  it('sin criterios solo manda la página: lo ausente no viaja', async () => {
    api.get.mockResolvedValue(page)

    await alertsApiService.list()

    expect(api.get).toHaveBeenCalledWith('/alerts', { page: 0 })
  })

  it('filtra por origen, categoría, planta y localización con sus descendientes', async () => {
    api.get.mockResolvedValue(page)

    await alertsApiService.list({ source: 'medicion', category: 'temperatura', plant: '5', location: '9', includeDescendants: true })

    expect(api.get).toHaveBeenCalledWith('/alerts', {
      page: 0, source: 'medicion', category: 'temperatura', plant: '5', location: '9', includeDescendants: true,
    })
  })

  it('includeDescendants sin localización no viaja', async () => {
    api.get.mockResolvedValue(page)

    await alertsApiService.list({ includeDescendants: true })

    expect(api.get).toHaveBeenCalledWith('/alerts', { page: 0 })
  })

  it('pide el detalle de una alerta', async () => {
    api.get.mockResolvedValue({ id: '3' })

    await alertsApiService.detail('3')

    expect(api.get).toHaveBeenCalledWith('/alerts/3')
  })

  it('anota una incidencia sin los campos vacíos', async () => {
    api.post.mockResolvedValue({ id: '1' })

    await alertsApiService.create({ plantId: '7', category: 'otra', severity: 'media', reason: ' Cochinilla ', recommendedAction: '  ' })

    expect(api.post).toHaveBeenCalledWith('/alerts', { plantId: '7', category: 'otra', severity: 'media', reason: 'Cochinilla' })
  })

  it('revisa, resuelve y descarta con el comentario opcional', async () => {
    api.post.mockResolvedValue({ id: '1' })

    await alertsApiService.transition('1', 'review')
    await alertsApiService.transition('1', 'resolve', ' Ya está ')
    await alertsApiService.transition('1', 'dismiss', '')

    expect(api.post).toHaveBeenNthCalledWith(1, '/alerts/1/review', {})
    expect(api.post).toHaveBeenNthCalledWith(2, '/alerts/1/resolve', { comment: 'Ya está' })
    expect(api.post).toHaveBeenNthCalledWith(3, '/alerts/1/dismiss', {})
  })

  it('un fallo es un valor, no una excepción', async () => {
    api.post.mockRejectedValue(new ApiError(409, 'La alerta ya está cerrada'))

    const result = await alertsApiService.transition('1', 'resolve')

    expect(result).toMatchObject({ success: false, data: null, error: { status: 409 } })
  })
})
