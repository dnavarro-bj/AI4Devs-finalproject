import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { soilMixesApiService } from './soilMixes.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * El contrato del service: qué pide al API y qué devuelve. **Nunca lanza**: el fallo viaja como
 * valor, así que cada operación tiene su camino de error comprobado (ADR-015).
 */
describe('service del catálogo de mezclas', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const mix = {
    id: '100001',
    name: 'Sustrato mineral de drenaje rápido',
    organicPercentage: 20,
    mineralPercentage: 80,
    phMin: 5.5,
    phMax: 6.5,
    description: 'akadama, pómez, turba',
  }

  it('pide el catálogo paginado', async () => {
    api.get.mockResolvedValue({ content: [mix], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 })

    const result = await soilMixesApiService.list(2)

    expect(api.get).toHaveBeenCalledWith('/soil-mixes', { page: 2 })
    expect(result.success).toBe(true)
    expect(result.data!.content[0]!.name).toBe('Sustrato mineral de drenaje rápido')
  })

  it('pasa el criterio de orden al API, que es quien ordena', async () => {
    api.get.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 })

    await soilMixesApiService.list(0, 'name,desc')

    expect(api.get).toHaveBeenCalledWith('/soil-mixes', { page: 0, sort: 'name,desc' })
  })

  it('pide la ficha con su recuento de especies', async () => {
    api.get.mockResolvedValue({ ...mix, speciesCount: 3 })

    const result = await soilMixesApiService.detail('100001')

    expect(api.get).toHaveBeenCalledWith('/soil-mixes/100001')
    expect(result.data!.speciesCount).toBe(3)
  })

  it('registra una mezcla con su receta', async () => {
    api.post.mockResolvedValue(mix)
    const input = {
      name: 'Sustrato mineral de drenaje rápido',
      organicPercentage: 20,
      mineralPercentage: 80,
      phMin: 5.5,
      phMax: 6.5,
      description: 'akadama, pómez, turba',
    }

    const result = await soilMixesApiService.create(input)

    expect(api.post).toHaveBeenCalledWith('/soil-mixes', input)
    expect(result.data!.id).toBe('100001')
  })

  it('corrige una mezcla por reemplazo completo', async () => {
    api.put.mockResolvedValue({ ...mix, name: 'Mezcla corregida' })

    const result = await soilMixesApiService.update('100001', {
      name: 'Mezcla corregida',
      organicPercentage: 40,
      mineralPercentage: 60,
      phMin: 6,
      phMax: 7,
      description: null,
    })

    expect(api.put).toHaveBeenCalledWith('/soil-mixes/100001', expect.objectContaining({ name: 'Mezcla corregida' }))
    expect(result.data!.name).toBe('Mezcla corregida')
  })

  it('retira una mezcla, que no devuelve cuerpo', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await soilMixesApiService.remove('100001')

    expect(api.delete).toHaveBeenCalledWith('/soil-mixes/100001')
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('devuelve el conflicto de una mezcla en uso como valor, sin lanzar', async () => {
    api.delete.mockRejectedValue(
      new ApiError(409, "La mezcla de tierra '100001' la recomienda alguna especie y no se puede eliminar"),
    )

    const result = await soilMixesApiService.remove('100001')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    expect(result.error!.message).toContain('no se puede eliminar')
  })

  it('devuelve la composición rechazada como error de validación, conservando su mensaje', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'Los porcentajes de la mezcla deben sumar 100, y suman 70'))

    const result = await soilMixesApiService.create({
      name: 'Mezcla imposible',
      organicPercentage: 30,
      mineralPercentage: 40,
      phMin: 5.5,
      phMax: 6.5,
      description: null,
    })

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    expect(result.error!.message).toContain('sumar 100')
  })

  it('devuelve una mezcla inexistente como no encontrada', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La mezcla de tierra '999' no existe"))

    const result = await soilMixesApiService.detail('999')

    expect(result.error!.code).toBe(ErrorCodes.NOT_FOUND)
    expect(result.data).toBeNull()
  })

  /** Un fallo de red no trae respuesta, así que no hay `status` que interpretar. */
  it('no deja escapar un fallo de red', async () => {
    api.get.mockRejectedValue(new ApiError(0, 'No se ha podido completar la operación. Inténtalo de nuevo.'))

    const result = await soilMixesApiService.list()

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.NETWORK_ERROR)
  })

  it('ninguna operación lanza, ni siquiera cuando el fallo no es un ApiError', async () => {
    api.get.mockRejectedValue(new TypeError('algo raro'))

    await expect(soilMixesApiService.detail('100001')).resolves.toMatchObject({ success: false })
  })
})
