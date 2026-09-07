import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { speciesApiService } from './species.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * El contrato del service del catálogo de especies. Su CRUD lleva en verde desde T-08 y **nunca
 * se había ejercitado entero** desde el frontend: solo el listado, para poblar el selector del
 * alta de planta.
 *
 * Como todo service, no lanza: el fallo viaja como valor (ADR-015).
 */
describe('service del catálogo de especies', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const care = {
    id: '200001',
    scientificName: 'Echinocactus grusonii',
    commonName: 'Asiento de suegra',
    minHumidity: 10,
    maxHumidity: 30,
    minTemperature: 10,
    maxTemperature: 35,
    minLightHours: 6,
    maxLightHours: 10,
    wateringGuideline: 'cada 10-20 dias',
    soilMix: { id: '100001', name: 'Sustrato mineral de drenaje rápido' },
  }

  const input = {
    scientificName: 'Echinocactus grusonii',
    commonName: 'Asiento de suegra',
    minHumidity: 10,
    maxHumidity: 30,
    minTemperature: 10,
    maxTemperature: 35,
    minLightHours: 6,
    maxLightHours: 10,
    wateringGuideline: 'cada 10-20 dias',
    soilMixId: '100001',
  }

  it('pide el catálogo paginado', async () => {
    api.get.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 })

    await speciesApiService.list(3)

    expect(api.get).toHaveBeenCalledWith('/species', { page: 3 })
  })

  /** Ordenar es del API: la tabla solo tiene delante una página (ADR-009). */
  it('pasa el criterio de orden al API', async () => {
    api.get.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 })

    await speciesApiService.list(0, 'scientificName,desc')

    expect(api.get).toHaveBeenCalledWith('/species', { page: 0, sort: 'scientificName,desc' })
  })

  it('pide la ficha con sus rangos y su mezcla', async () => {
    api.get.mockResolvedValue(care)

    const result = await speciesApiService.detail('200001')

    expect(api.get).toHaveBeenCalledWith('/species/200001')
    expect(result.data!.minHumidity).toBe(10)
    expect(result.data!.soilMix.id).toBe('100001')
  })

  it('registra una especie con su mezcla por identificador', async () => {
    api.post.mockResolvedValue(care)

    const result = await speciesApiService.create(input)

    expect(api.post).toHaveBeenCalledWith('/species', input)
    expect(result.data!.id).toBe('200001')
  })

  it('corrige una especie por reemplazo completo', async () => {
    api.put.mockResolvedValue({ ...care, commonName: 'Bola de oro' })

    const result = await speciesApiService.update('200001', { ...input, commonName: 'Bola de oro' })

    expect(api.put).toHaveBeenCalledWith('/species/200001', expect.objectContaining({ commonName: 'Bola de oro' }))
    expect(result.data!.commonName).toBe('Bola de oro')
  })

  it('retira una especie, que no devuelve cuerpo', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await speciesApiService.remove('200001')

    expect(api.delete).toHaveBeenCalledWith('/species/200001')
    expect(result.success).toBe(true)
  })

  it('devuelve el nombre científico duplicado como conflicto, conservando su mensaje', async () => {
    api.post.mockRejectedValue(
      new ApiError(409, "Ya existe una especie con el nombre científico 'Echinocactus grusonii'"),
    )

    const result = await speciesApiService.create(input)

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    expect(result.error!.message).toContain('Ya existe')
  })

  it('devuelve la especie con ejemplares como conflicto al retirarla', async () => {
    api.delete.mockRejectedValue(
      new ApiError(409, "La especie '200001' tiene ejemplares registrados y no se puede eliminar"),
    )

    const result = await speciesApiService.remove('200001')

    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    expect(result.error!.message).toContain('ejemplares registrados')
  })

  it('devuelve un rango invertido como error de validación', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'La humedad mínima (80) no puede superar a la máxima (20)'))

    const result = await speciesApiService.create({ ...input, minHumidity: 80, maxHumidity: 20 })

    expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    expect(result.error!.message).toContain('no puede superar')
  })

  it('devuelve una especie inexistente como no encontrada', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La especie '999' no existe"))

    const result = await speciesApiService.detail('999')

    expect(result.error!.code).toBe(ErrorCodes.NOT_FOUND)
    expect(result.data).toBeNull()
  })

  it('ninguna operación lanza, ni siquiera cuando el fallo no es un ApiError', async () => {
    api.put.mockRejectedValue(new TypeError('algo raro'))

    await expect(speciesApiService.update('200001', input)).resolves.toMatchObject({ success: false })
  })
})
