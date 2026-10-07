import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { timelineApiService } from './timeline.api.service'

const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
mockNuxtImport('getApiClient', () => () => api)

const page = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 }

describe('timelineApiService', () => {
  beforeEach(() => Object.values(api).forEach((fn) => fn.mockReset()))

  it('pide la cronología con el tipo repetido y la página', async () => {
    api.get.mockResolvedValue(page)

    const result = await timelineApiService.list('7', { types: ['comentario', 'intervencion'], page: 2 })

    expect(api.get).toHaveBeenCalledWith('/plants/7/timeline', { page: 2, type: ['comentario', 'intervencion'] })
    expect(result.success).toBe(true)
  })

  it('sin filtro ni tamaño, no manda ni `type` ni `size`', async () => {
    api.get.mockResolvedValue(page)

    await timelineApiService.list('7')

    expect(api.get).toHaveBeenCalledWith('/plants/7/timeline', { page: 0 })
  })

  it('el tamaño viaja cuando se pide, como la última floración', async () => {
    api.get.mockResolvedValue(page)

    await timelineApiService.list('7', { types: ['floracion'], size: 1 })

    expect(api.get).toHaveBeenCalledWith('/plants/7/timeline', { page: 0, type: ['floracion'], size: 1 })
  })

  it('un fallo es un valor, no una excepción', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La planta '7' no existe"))

    const result = await timelineApiService.list('7')

    expect(result).toMatchObject({ success: false, data: null, error: { status: 404 } })
  })

  it('crea un comentario sin los campos vacíos', async () => {
    api.post.mockResolvedValue({ id: '1', type: 'comentario' })

    const result = await timelineApiService.create('7', 'comments', { text: 'Marca en el lado oeste', occurredAt: '' })

    expect(api.post).toHaveBeenCalledWith('/plants/7/comments', { text: 'Marca en el lado oeste' })
    expect(result.data).toMatchObject({ id: '1' })
  })

  it('corrige una intervención por reemplazo completo', async () => {
    api.put.mockResolvedValue({ id: '9', type: 'intervencion' })

    await timelineApiService.update('7', 'interventions', '9', { type: 'trasplante', potSize: '12 cm', product: undefined })

    expect(api.put).toHaveBeenCalledWith('/plants/7/interventions/9', { type: 'trasplante', potSize: '12 cm' })
  })

  it('registra una floración abierta sin fin', async () => {
    api.post.mockResolvedValue({ id: '3', type: 'floracion' })

    await timelineApiService.create('7', 'blooms', { startedOn: '2026-05-22', status: 'en_flor', endedOn: undefined })

    expect(api.post).toHaveBeenCalledWith('/plants/7/blooms', { startedOn: '2026-05-22', status: 'en_flor' })
  })

  it('retira por su identificador y devuelve null', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await timelineApiService.remove('7', 'blooms', '3')

    expect(api.delete).toHaveBeenCalledWith('/plants/7/blooms/3')
    expect(result).toEqual({ success: true, data: null, error: null })
  })

  it('un rechazo del API al guardar llega como error con su mensaje', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'La fecha de la floración no puede estar en el futuro'))

    const result = await timelineApiService.create('7', 'blooms', { startedOn: '2099-01-01', status: 'boton' })

    expect(result.success).toBe(false)
    expect(result.error!.message).toContain('futuro')
  })
})
