import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { plantsApiService } from './plants.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * La edición del ejemplar: el service **nunca lanza**, el fallo viaja como valor (ADR-015), así
 * que cada camino de error de `PUT /plants/{id}` está comprobado.
 */
describe('plantsApiService.update', () => {
  beforeEach(() => {
    api.put.mockReset()
  })

  it('envía la planta entera a PUT /plants/{id} y devuelve el detalle', async () => {
    const detail = { id: '1', nickname: 'Bola 2' }
    api.put.mockResolvedValue(detail)

    const result = await plantsApiService.update('1', 'Bola 2', '300002', '200002')

    expect(api.put).toHaveBeenCalledWith('/plants/1', {
      nickname: 'Bola 2',
      locationId: '300002',
      speciesId: '200002',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual(detail)
  })

  it('un 400 del API sale como valor, con su mensaje, y no lanza', async () => {
    api.put.mockRejectedValue(new ApiError(400, "La especie '999' no existe"))

    const result = await plantsApiService.update('1', 'x', '300001', '999')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    expect(result.error!.message).toContain('999')
  })

  it('un 404 de la planta sale como NOT_FOUND', async () => {
    api.put.mockRejectedValue(new ApiError(404, "La planta '1' no existe"))

    const result = await plantsApiService.update('1', 'x', '300001', '200001')

    expect(result.error!.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('un fallo de red también sale como valor', async () => {
    api.put.mockRejectedValue(new ApiError(0, 'sin conexión'))

    const result = await plantsApiService.update('1', 'x', '300001', '200001')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.NETWORK_ERROR)
  })
})

/** El filtro por código viaja solo cuando hay texto: un parámetro vacío no es un filtro. */
describe('plantsApiService.list con código', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 })
  })

  it('envía el código como parámetro `code`', async () => {
    await plantsApiService.list({ code: 'gruss' })

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ code: 'gruss' }))
  })

  it('recorta los espacios del texto', async () => {
    await plantsApiService.list({ code: '  gruss  ' })

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ code: 'gruss' }))
  })

  it('un texto vacío o en blanco no envía el parámetro', async () => {
    await plantsApiService.list({ code: '   ' })
    await plantsApiService.list({ code: '' })
    await plantsApiService.list({})

    for (const [, params] of api.get.mock.calls) {
      expect(params).not.toHaveProperty('code')
    }
  })

  it('se combina con la localización y la etiqueta', async () => {
    await plantsApiService.list({ code: 'gruss', location: '300001', tag: ['400001'] })

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({
      code: 'gruss', location: '300001', tag: ['400001'],
    }))
  })
})
