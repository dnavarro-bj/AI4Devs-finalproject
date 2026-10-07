import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { catalogsApiService } from './catalogs.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** El contrato del service del catálogo de etiquetas. **Nunca lanza** (ADR-015). */
describe('service del catálogo de etiquetas', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const tag = { id: '400001', name: 'Globular' }

  it('pide el catálogo paginado con el uso de cada etiqueta', async () => {
    api.get.mockResolvedValue({
      content: [{ ...tag, plantCount: 218 }, { id: '400002', name: 'Sin uso', plantCount: 0 }],
      totalElements: 2,
      totalPages: 1,
      pageNumber: 0,
      pageSize: 25,
    })

    const result = await catalogsApiService.listTags(1)

    expect(api.get).toHaveBeenCalledWith('/tags', { page: 1 })
    expect(result.data!.content[0]!.plantCount).toBe(218)
    expect(result.data!.content[1]!.plantCount, 'el cero es un dato').toBe(0)
  })

  it('pide la ficha con su nombre normalizado', async () => {
    api.get.mockResolvedValue({ ...tag, normalizedName: 'globular', plantCount: 3 })

    const result = await catalogsApiService.tagDetail('400001')

    expect(api.get).toHaveBeenCalledWith('/tags/400001')
    expect(result.data!.normalizedName).toBe('globular')
    expect(result.data!.plantCount).toBe(3)
  })

  it('registra una etiqueta', async () => {
    api.post.mockResolvedValue(tag)

    const result = await catalogsApiService.createTag('Globular')

    expect(api.post).toHaveBeenCalledWith('/tags', { name: 'Globular' })
    expect(result.data!.id).toBe('400001')
  })

  it('renombra una etiqueta', async () => {
    api.put.mockResolvedValue({ ...tag, name: 'Globulares' })

    const result = await catalogsApiService.renameTag('400001', 'Globulares')

    expect(api.put).toHaveBeenCalledWith('/tags/400001', { name: 'Globulares' })
    expect(result.data!.name).toBe('Globulares')
  })

  /** La combinación es destructiva: la respuesta dice el alcance, no solo que fue bien. */
  it('combina dos etiquetas y devuelve a cuántas plantas alcanzó', async () => {
    api.post.mockResolvedValue({ target: tag, affectedPlants: 87 })

    const result = await catalogsApiService.mergeTags('400002', '400001')

    expect(api.post).toHaveBeenCalledWith('/tags/400002/merge', { targetId: '400001' })
    expect(result.data!.affectedPlants).toBe(87)
    expect(result.data!.target.name).toBe('Globular')
  })

  it('retira una etiqueta, que no devuelve cuerpo', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await catalogsApiService.removeTag('400001')

    expect(api.delete).toHaveBeenCalledWith('/tags/400001')
    expect(result.success).toBe(true)
  })

  it('devuelve el nombre ya usado como conflicto, sin lanzar', async () => {
    api.put.mockRejectedValue(new ApiError(409, "Ya existe un tag con el nombre 'Globular'"))

    const result = await catalogsApiService.renameTag('400002', 'Globular')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    expect(result.error!.message).toContain('Ya existe')
  })

  it('devuelve la etiqueta en uso como conflicto al retirarla', async () => {
    api.delete.mockRejectedValue(
      new ApiError(409, "El tag '400001' lo tienen plantas registradas y no se puede eliminar"),
    )

    const result = await catalogsApiService.removeTag('400001')

    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    expect(result.error!.message).toContain('no se puede eliminar')
  })

  it('devuelve combinar consigo misma como error de validación', async () => {
    api.post.mockRejectedValue(new ApiError(400, "No se puede combinar el tag '400001' consigo mismo"))

    const result = await catalogsApiService.mergeTags('400001', '400001')

    expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
  })

  it('devuelve una etiqueta inexistente como no encontrada', async () => {
    api.get.mockRejectedValue(new ApiError(404, "El tag '999' no existe"))

    const result = await catalogsApiService.tagDetail('999')

    expect(result.error!.code).toBe(ErrorCodes.NOT_FOUND)
    expect(result.data).toBeNull()
  })

  it('ninguna operación lanza, ni siquiera cuando el fallo no es un ApiError', async () => {
    api.post.mockRejectedValue(new TypeError('algo raro'))

    await expect(catalogsApiService.mergeTags('1', '2')).resolves.toMatchObject({ success: false })
  })
})
