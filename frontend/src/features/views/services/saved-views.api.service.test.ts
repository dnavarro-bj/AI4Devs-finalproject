import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { savedViewsApiService } from './saved-views.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** El contrato del service de vistas guardadas: habla con el API y nada más, y no lanza (ADR-015). */
describe('service de vistas guardadas', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const view = {
    id: '1', scope: 'species', name: 'Sensibles al frío', query: 'minTemperatureFrom=9', matchCount: 12,
    createdAt: '2026-10-07T10:00:00Z', updatedAt: '2026-10-07T10:00:00Z',
  }

  it('lista las vistas de un ámbito en una sola página y devuelve su contenido', async () => {
    api.get.mockResolvedValue({ content: [view], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 500 })

    const result = await savedViewsApiService.list('species')

    expect(api.get).toHaveBeenCalledWith('/saved-views', { scope: 'species', page: 0, size: 500 })
    expect(result).toEqual({ success: true, data: [view], error: null })
  })

  it('crea una vista con el cuerpo tal cual', async () => {
    api.post.mockResolvedValue(view)
    const input = { scope: 'species' as const, name: 'Sensibles al frío', query: 'minTemperatureFrom=9' }

    const result = await savedViewsApiService.create(input)

    expect(api.post).toHaveBeenCalledWith('/saved-views', input)
    expect(result.data).toEqual(view)
  })

  it('reemplaza una vista entera con PUT', async () => {
    api.put.mockResolvedValue(view)
    const input = { scope: 'plants' as const, name: 'Cuarentena', query: 'status=cuarentena', columns: ['species'] }

    await savedViewsApiService.replace('1', input)

    expect(api.put).toHaveBeenCalledWith('/saved-views/1', input)
  })

  it('retira una vista y no devuelve nada', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await savedViewsApiService.remove('1')

    expect(api.delete).toHaveBeenCalledWith('/saved-views/1')
    expect(result).toEqual({ success: true, data: null, error: null })
  })

  it('un nombre repetido sale como conflicto, con el mensaje del API', async () => {
    api.post.mockRejectedValue(new ApiError(409, 'Ya existe una vista con ese nombre'))

    const result = await savedViewsApiService.create({ scope: 'plants', name: 'x', query: '' })

    expect(result.success).toBe(false)
    expect(result.error).toMatchObject({ code: ErrorCodes.CONFLICT, message: 'Ya existe una vista con ese nombre', status: 409 })
  })

  it('una consulta inválida sale como error de validación', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'Mes inválido'))

    const result = await savedViewsApiService.create({ scope: 'species', name: 'x', query: 'growthMonth=13' })

    expect(result.error).toMatchObject({ code: ErrorCodes.VALIDATION_ERROR, status: 400 })
  })

  it('ningún método lanza: un fallo de red también es un valor', async () => {
    api.get.mockRejectedValue(new ApiError(0, 'sin red'))
    api.put.mockRejectedValue(new ApiError(0, 'sin red'))
    api.delete.mockRejectedValue(new ApiError(0, 'sin red'))

    expect((await savedViewsApiService.list('plants')).success).toBe(false)
    expect((await savedViewsApiService.replace('1', { scope: 'plants', name: 'x', query: '' })).success).toBe(false)
    expect((await savedViewsApiService.remove('1')).success).toBe(false)
  })
})
