import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { locationsApiService } from './locations.api.service'
import type { LocationInput } from '../types/location.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * El contrato del service de localizaciones. **Nunca lanza**: el fallo viaja como valor, así que
 * cada operación tiene su camino de error comprobado (ADR-015).
 */
describe('service de localizaciones', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const input = (overrides: Partial<LocationInput> = {}): LocationInput => ({
    name: 'Bancada norte',
    code: 'LOC-I1-BN',
    parentId: '300001',
    description: '',
    locationType: 'bancada',
    capacity: 250,
    operationalNotes: '',
    environment: 'cubierto',
    sunExposure: 'semisombra',
    ...overrides,
  })

  const page = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })

  describe('catálogo', () => {
    it('pide el catálogo paginado', async () => {
      api.get.mockResolvedValue(page([{ id: '300001', name: 'Invernadero 1' }]))

      const result = await locationsApiService.list({ page: 2 })

      expect(api.get).toHaveBeenCalledWith('/locations', { page: 2 })
      expect(result.success).toBe(true)
      expect(result.data!.content[0]!.name).toBe('Invernadero 1')
    })

    it('el texto y el tamaño viajan como `q` y `size`; un texto en blanco no viaja', async () => {
      api.get.mockResolvedValue(page([]))

      await locationsApiService.list({ q: '  inver ', size: 5 })
      expect(api.get).toHaveBeenLastCalledWith('/locations', { page: 0, q: 'inver', size: 5 })

      await locationsApiService.list({ q: '   ' })
      expect(api.get).toHaveBeenLastCalledWith('/locations', { page: 0 })
    })

    it('los criterios ausentes no viajan, y los presentes sí', async () => {
      api.get.mockResolvedValue(page([]))

      await locationsApiService.list({ sort: 'name', parentId: '300001' })
      await locationsApiService.list({ root: true })

      expect(api.get).toHaveBeenNthCalledWith(1, '/locations', { page: 0, sort: 'name', parentId: '300001' })
      expect(api.get).toHaveBeenNthCalledWith(2, '/locations', { page: 0, root: true })
    })

    it('conserva el cero de la carga: es un dato, no una ausencia', async () => {
      api.get.mockResolvedValue(page([{ id: '1', name: 'Vacía', plantCount: 0, plantCountTotal: 0 }]))

      const result = await locationsApiService.list()

      expect(result.data!.content[0]).toMatchObject({ plantCount: 0, plantCountTotal: 0 })
    })
  })

  describe('ficha', () => {
    it('pide la ficha con sus ancestros, hijas y recuentos', async () => {
      api.get.mockResolvedValue({ id: '300002', name: 'Bancada norte', plantCount: 4, plantCountTotal: 62 })

      const result = await locationsApiService.detail('300002')

      expect(api.get).toHaveBeenCalledWith('/locations/300002')
      expect(result.data!.plantCountTotal).toBe(62)
    })

    it('devuelve una localización inexistente como no encontrada', async () => {
      api.get.mockRejectedValue(new ApiError(404, "La localización '999' no existe"))

      const result = await locationsApiService.detail('999')

      expect(result.error!.code).toBe(ErrorCodes.NOT_FOUND)
      expect(result.data).toBeNull()
    })
  })

  describe('alta y corrección', () => {
    it('da de alta con el cuerpo completo', async () => {
      api.post.mockResolvedValue({ id: '300002' })

      await locationsApiService.create(input())

      expect(api.post).toHaveBeenCalledWith('/locations', {
        name: 'Bancada norte',
        code: 'LOC-I1-BN',
        parentId: '300001',
        locationType: 'bancada',
        capacity: 250,
        environment: 'cubierto',
        sunExposure: 'semisombra',
      })
    })

    it('lo vacío no viaja: ni descripción en blanco, ni notas, ni padre nulo', async () => {
      api.post.mockResolvedValue({ id: '300002' })

      await locationsApiService.create(input({
        parentId: null, locationType: null, capacity: null, environment: null, sunExposure: null,
        description: '   ', operationalNotes: '',
      }))

      expect(api.post).toHaveBeenCalledWith('/locations', { name: 'Bancada norte', code: 'LOC-I1-BN' })
    })

    it('el nombre y el código viajan sin espacios sobrantes', async () => {
      api.post.mockResolvedValue({ id: '300002' })

      await locationsApiService.create(input({ name: '  Bancada norte ', code: ' LOC-I1-BN ', parentId: null, locationType: null, capacity: null, environment: null, sunExposure: null }))

      expect(api.post).toHaveBeenCalledWith('/locations', { name: 'Bancada norte', code: 'LOC-I1-BN' })
    })

    it('la corrección es un PUT de reemplazo completo', async () => {
      api.put.mockResolvedValue({ id: '300002' })

      await locationsApiService.update('300002', input({ parentId: null }))

      expect(api.put).toHaveBeenCalledWith('/locations/300002', expect.objectContaining({ name: 'Bancada norte', code: 'LOC-I1-BN' }))
      expect(api.put.mock.calls[0]![1]).not.toHaveProperty('parentId')
    })

    it('devuelve un código repetido como conflicto, conservando su mensaje', async () => {
      api.post.mockRejectedValue(new ApiError(409, "El código 'LOC-I1' ya lo usa otra localización"))

      const result = await locationsApiService.create(input())

      expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
      expect(result.error!.message).toContain('LOC-I1')
    })

    it('devuelve un ciclo en la jerarquía como conflicto', async () => {
      api.put.mockRejectedValue(new ApiError(409, 'Una localización no puede contenerse a sí misma'))

      const result = await locationsApiService.update('300001', input())

      expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    })

    it('devuelve un padre inexistente como error de validación', async () => {
      api.post.mockRejectedValue(new ApiError(400, "La localización '999' no existe"))

      const result = await locationsApiService.create(input())

      expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })
  })

  describe('retirada', () => {
    it('retira una localización, que no devuelve cuerpo', async () => {
      api.delete.mockResolvedValue(undefined)

      const result = await locationsApiService.remove('300001')

      expect(api.delete).toHaveBeenCalledWith('/locations/300001')
      expect(result).toEqual({ success: true, data: null, error: null })
    })

    it('devuelve la retirada bloqueada como conflicto, sin lanzar', async () => {
      api.delete.mockRejectedValue(new ApiError(409, "La localización '300001' alberga ejemplares"))

      const result = await locationsApiService.remove('300001')

      expect(result.error!.code).toBe(ErrorCodes.CONFLICT)
    })
  })

  describe('movimientos', () => {
    it('mueve un lote al destino y devuelve el recuento', async () => {
      api.post.mockResolvedValue({ moved: 2, unchanged: 1 })

      const result = await locationsApiService.move('300009', ['1', '2', '3'])

      expect(api.post).toHaveBeenCalledWith('/locations/300009/movements', { plantIds: ['1', '2', '3'] })
      expect(result.data).toEqual({ moved: 2, unchanged: 1 })
    })

    it('devuelve el lote rechazado como valor', async () => {
      api.post.mockRejectedValue(new ApiError(400, "La planta '9' no existe"))

      const result = await locationsApiService.move('300009', ['9'])

      expect(result.error!.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })

    it('pide el historial de una localización paginado', async () => {
      api.get.mockResolvedValue(page([]))

      await locationsApiService.movements('300002', 1)

      expect(api.get).toHaveBeenCalledWith('/locations/300002/movements', { page: 1 })
    })

    it('pide el historial de un ejemplar paginado', async () => {
      api.get.mockResolvedValue(page([]))

      await locationsApiService.plantMovements('882', 0)

      expect(api.get).toHaveBeenCalledWith('/plants/882/movements', { page: 0 })
    })
  })

  it('ninguna operación lanza, ni siquiera cuando el fallo no es un ApiError', async () => {
    api.get.mockRejectedValue(new TypeError('algo raro'))
    api.post.mockRejectedValue(new TypeError('algo raro'))

    await expect(locationsApiService.detail('1')).resolves.toMatchObject({ success: false })
    await expect(locationsApiService.list()).resolves.toMatchObject({ success: false })
    await expect(locationsApiService.move('1', ['2'])).resolves.toMatchObject({ success: false })
  })

  it('un fallo de red no deja escapar la excepción', async () => {
    api.get.mockRejectedValue(new ApiError(0, 'No se ha podido completar la operación. Inténtalo de nuevo.'))

    const result = await locationsApiService.list()

    expect(result.error!.code).toBe(ErrorCodes.NETWORK_ERROR)
  })
})
