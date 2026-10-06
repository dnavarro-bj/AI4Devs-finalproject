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

/** La ficha ampliada y el estado (`ficha-del-ejemplar`). */
describe('plantsApiService: ficha ampliada y estado', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.get.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 })
  })

  it('el alta envía la ficha y el estado inicial junto a lo de siempre', async () => {
    api.post.mockResolvedValue({ id: '1' })

    await plantsApiService.create('Bola', '300001', '200001', {
      description: 'Adulto', germinationYear: 2021, origin: 'vivero',
    }, 'cuarentena')

    expect(api.post).toHaveBeenCalledWith('/plants', {
      nickname: 'Bola', locationId: '300001', speciesId: '200001',
      description: 'Adulto', germinationYear: 2021, origin: 'vivero', status: 'cuarentena',
    })
  })

  it('el alta sin ficha envía solo lo obligatorio', async () => {
    api.post.mockResolvedValue({ id: '1' })

    await plantsApiService.create('Bola', '300001', '200001')

    expect(api.post).toHaveBeenCalledWith('/plants', { nickname: 'Bola', locationId: '300001', speciesId: '200001' })
  })

  it('la edición envía la ficha entera y nunca el estado', async () => {
    api.put.mockResolvedValue({ id: '1' })

    await plantsApiService.update('1', 'Bola', '300001', '200001', { description: 'Adulto', germinationYear: 2021, germinationMonth: 4 })

    const body = api.put.mock.calls[0]![1] as Record<string, unknown>
    expect(body).toMatchObject({ nickname: 'Bola', description: 'Adulto', germinationYear: 2021, germinationMonth: 4 })
    expect(body).not.toHaveProperty('status')
  })

  it('cambiar el estado va a su propia operación, con el motivo si lo hay', async () => {
    api.put.mockResolvedValue({ id: '1', status: 'vendida' })

    const result = await plantsApiService.changeStatus('1', 'vendida', 'A un coleccionista')

    expect(api.put).toHaveBeenCalledWith('/plants/1/status', { status: 'vendida', reason: 'A un coleccionista' })
    expect(result.data!.status).toBe('vendida')
  })

  it('un cambio de estado sin motivo no envía el campo', async () => {
    api.put.mockResolvedValue({ id: '1' })

    await plantsApiService.changeStatus('1', 'enferma')
    await plantsApiService.changeStatus('1', 'enferma', '   ')

    for (const [, body] of api.put.mock.calls) expect(body).toEqual({ status: 'enferma' })
  })

  it('un 409 de transición no permitida sale como valor', async () => {
    api.put.mockRejectedValue(new ApiError(409, "Desde el estado 'muerta' solo se puede volver a 'activa'"))

    const result = await plantsApiService.changeStatus('1', 'vendida')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
  })

  it('el historial se pide paginado a su endpoint', async () => {
    await plantsApiService.statusChanges('1', 2)

    expect(api.get).toHaveBeenCalledWith('/plants/1/status-changes', { page: 2 })
  })

  it('el listado envía los estados pedidos, repetidos, y nada si no se pide ninguno', async () => {
    await plantsApiService.list({ status: ['activa', 'muerta'] })
    await plantsApiService.list({})
    await plantsApiService.list({ status: [] })

    expect(api.get.mock.calls[0]![1]).toMatchObject({ status: ['activa', 'muerta'] })
    expect(api.get.mock.calls[1]![1]).not.toHaveProperty('status')
    expect(api.get.mock.calls[2]![1]).not.toHaveProperty('status')
  })
})
