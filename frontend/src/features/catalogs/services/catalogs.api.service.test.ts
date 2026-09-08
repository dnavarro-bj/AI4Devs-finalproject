import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { catalogsApiService } from './catalogs.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * El contrato del service de catálogos con las operaciones que abren la ficha de localización.
 * **Nunca lanza**: el fallo viaja como valor, así que cada operación tiene su camino de error
 * comprobado (ADR-015).
 */
describe('service del catálogo de localizaciones', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const location = { id: '300001', name: 'Invernadero 1' }

  it('pide el catálogo paginado', async () => {
    api.get.mockResolvedValue({ content: [location], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 })

    const result = await catalogsApiService.listLocations(2)

    expect(api.get).toHaveBeenCalledWith('/locations', { page: 2 })
    expect(result.success).toBe(true)
    expect(result.data!.content[0]!.name).toBe('Invernadero 1')
  })

  /** El mapa del vivero se apoya en la carga de cada sitio: viaja en el listado, no solo en la ficha. */
  it('cada fila del catálogo trae la carga que soporta', async () => {
    api.get.mockResolvedValue({
      content: [{ ...location, plantCount: 486 }, { id: '300002', name: 'Bandeja A3', plantCount: 0 }],
      totalElements: 2,
      totalPages: 1,
      pageNumber: 0,
      pageSize: 25,
    })

    const result = await catalogsApiService.listLocations()

    expect(result.data!.content[0]!.plantCount).toBe(486)
    expect(result.data!.content[1]!.plantCount, 'el cero es un dato, no una ausencia').toBe(0)
  })

  it('pide la ficha con el número de ejemplares que alberga', async () => {
    api.get.mockResolvedValue({ ...location, plantCount: 2 })

    const result = await catalogsApiService.locationDetail('300001')

    expect(api.get).toHaveBeenCalledWith('/locations/300001')
    expect(result.data!.plantCount).toBe(2)
  })

  /** El cero es un dato, no una ausencia: es lo que decide si se puede retirar. */
  it('conserva el cero de una localización vacía', async () => {
    api.get.mockResolvedValue({ ...location, plantCount: 0 })

    const result = await catalogsApiService.locationDetail('300001')

    expect(result.data!.plantCount).toBe(0)
  })

  it('registra una localización con su nombre', async () => {
    api.post.mockResolvedValue({ id: '300004', name: 'Bandeja B1' })

    const result = await catalogsApiService.createLocation('Bandeja B1')

    expect(api.post).toHaveBeenCalledWith('/locations', { name: 'Bandeja B1' })
    expect(result.data!.id).toBe('300004')
  })

  it('corrige el nombre de una localización', async () => {
    api.put.mockResolvedValue({ ...location, name: 'Invernadero principal' })

    const result = await catalogsApiService.renameLocation('300001', 'Invernadero principal')

    expect(api.put).toHaveBeenCalledWith('/locations/300001', { name: 'Invernadero principal' })
    expect(result.data!.name).toBe('Invernadero principal')
  })

  it('retira una localización, que no devuelve cuerpo', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await catalogsApiService.removeLocation('300001')

    expect(api.delete).toHaveBeenCalledWith('/locations/300001')
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
  })

  it('devuelve el conflicto de una localización con ejemplares como valor, sin lanzar', async () => {
    api.delete.mockRejectedValue(
      new ApiError(409, "La localización '300001' alberga ejemplares y no se puede eliminar"),
    )

    const result = await catalogsApiService.removeLocation('300001')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    expect(result.error!.message).toContain('no se puede eliminar')
  })

  it('devuelve el nombre en blanco como error de validación, conservando su mensaje', async () => {
    api.put.mockRejectedValue(new ApiError(400, 'name: el nombre es obligatorio'))

    const result = await catalogsApiService.renameLocation('300001', '   ')

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    expect(result.error!.message).toContain('obligatorio')
  })

  it('devuelve una localización inexistente como no encontrada', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La localización '999' no existe"))

    const result = await catalogsApiService.locationDetail('999')

    expect(result.error!.code).toBe(ErrorCodes.NOT_FOUND)
    expect(result.data).toBeNull()
  })

  /** Un fallo de red no trae respuesta, así que no hay `status` que interpretar. */
  it('no deja escapar un fallo de red', async () => {
    api.get.mockRejectedValue(new ApiError(0, 'No se ha podido completar la operación. Inténtalo de nuevo.'))

    const result = await catalogsApiService.listLocations()

    expect(result.success).toBe(false)
    expect(result.error!.code).toBe(ErrorCodes.NETWORK_ERROR)
  })

  it('ninguna operación lanza, ni siquiera cuando el fallo no es un ApiError', async () => {
    api.get.mockRejectedValue(new TypeError('algo raro'))

    await expect(catalogsApiService.locationDetail('300001')).resolves.toMatchObject({ success: false })
  })
})

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
