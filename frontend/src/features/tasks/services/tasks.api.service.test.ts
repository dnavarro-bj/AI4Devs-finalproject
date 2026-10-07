import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { tasksHttpService } from './tasks.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * El contrato del service de tareas contra el API real (`tareas-modelo-y-api`): rutas, parámetros y
 * errores como valor. La bandera del mock no entra aquí: se prueba la implementación HTTP tal cual.
 */
describe('tasksHttpService', () => {
  beforeEach(() => {
    for (const fn of [api.get, api.post, api.put, api.delete]) fn.mockReset()
  })

  const page = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 }

  describe('listado', () => {
    it('pide /tasks con los criterios repetidos y la fecha de referencia', async () => {
      api.get.mockResolvedValue(page)

      await tasksHttpService.list({
        status: ['pendiente'], type: ['riego', 'otra'], priority: ['alta'], q: 'raíces',
        due: 'overdue', today: '2026-10-07', sort: 'due,asc', size: 500,
      })

      expect(api.get).toHaveBeenCalledWith('/tasks', {
        page: 0, size: 500, sort: 'due,asc', status: ['pendiente'], type: ['riego', 'otra'],
        priority: ['alta'], q: 'raíces', due: 'overdue', today: '2026-10-07',
      })
    })

    it('los criterios ausentes o en blanco no viajan', async () => {
      api.get.mockResolvedValue(page)

      await tasksHttpService.list({ q: '  ', status: [], sort: '' })

      expect(api.get).toHaveBeenCalledWith('/tasks', { page: 0 })
    })

    it('el calendario pide un intervalo; la localización, con sus descendientes', async () => {
      api.get.mockResolvedValue(page)

      await tasksHttpService.list({ from: '2026-10-01', to: '2026-10-31', location: '300001', includeDescendants: true })

      expect(api.get).toHaveBeenCalledWith('/tasks', {
        page: 0, from: '2026-10-01', to: '2026-10-31', location: '300001', includeDescendants: true,
      })
    })

    it('includeDescendants solo viaja con una localización', async () => {
      api.get.mockResolvedValue(page)

      await tasksHttpService.list({ includeDescendants: true })

      expect(api.get).toHaveBeenCalledWith('/tasks', { page: 0 })
    })

    it('por planta y por especie', async () => {
      api.get.mockResolvedValue(page)

      await tasksHttpService.list({ plant: '99', species: '200001' })

      expect(api.get).toHaveBeenCalledWith('/tasks', { page: 0, plant: '99', species: '200001' })
    })

    it('un fallo es un error como valor y no lanza', async () => {
      api.get.mockRejectedValue(new ApiError(0, 'sin red'))

      const result = await tasksHttpService.list()

      expect(result.success).toBe(false)
      expect(result.error).toMatchObject({ code: ErrorCodes.NETWORK_ERROR })
    })
  })

  describe('ciclo de vida', () => {
    const task = { id: '10' }

    it('detalle, alta y reemplazo', async () => {
      api.get.mockResolvedValue(task)
      api.post.mockResolvedValue(task)
      api.put.mockResolvedValue(task)
      const input = { type: 'riego' as const, title: 'Regar', priority: 'normal' as const, dueFrom: '2026-10-15', locationId: '300001' }

      await tasksHttpService.detail('10')
      await tasksHttpService.create(input)
      await tasksHttpService.update('10', input)

      expect(api.get).toHaveBeenCalledWith('/tasks/10')
      expect(api.post).toHaveBeenCalledWith('/tasks', input)
      expect(api.put).toHaveBeenCalledWith('/tasks/10', input)
    })

    it('reprogramar solo envía el periodo', async () => {
      api.put.mockResolvedValue(task)

      await tasksHttpService.schedule('10', { dueFrom: '2026-10-20', dueTo: '2026-10-22' })

      expect(api.put).toHaveBeenCalledWith('/tasks/10/schedule', { dueFrom: '2026-10-20', dueTo: '2026-10-22' })
    })

    it('el alcance se pide paginado', async () => {
      api.get.mockResolvedValue(page)

      await tasksHttpService.scope('10', 2, 50)

      expect(api.get).toHaveBeenCalledWith('/tasks/10/scope', { page: 2, size: 50 })
    })

    it('completar envía solo las exclusiones y el registro, no la lista de incluidas', async () => {
      api.post.mockResolvedValue(task)

      await tasksHttpService.complete('10', { excludedPlantIds: ['3', '4'], reading: { waterAmountMl: 200 } })

      expect(api.post).toHaveBeenCalledWith('/tasks/10/complete', { excludedPlantIds: ['3', '4'], reading: { waterAmountMl: 200 } })
    })

    it('omitir y cancelar envían el motivo', async () => {
      api.post.mockResolvedValue(task)

      await tasksHttpService.skip('10', 'lluvia')
      await tasksHttpService.cancel('10')

      expect(api.post).toHaveBeenCalledWith('/tasks/10/skip', { reason: 'lluvia' })
      expect(api.post).toHaveBeenCalledWith('/tasks/10/cancel', {})
    })

    it('un conflicto llega con el mensaje del servidor', async () => {
      api.post.mockRejectedValue(new ApiError(409, 'La tarea ya no está pendiente'))

      const result = await tasksHttpService.complete('10', {})

      expect(result.success).toBe(false)
      expect(result.error).toMatchObject({ code: ErrorCodes.CONFLICT, message: 'La tarea ya no está pendiente', status: 409 })
    })

    it('una petición inválida llega como error de validación', async () => {
      api.post.mockRejectedValue(new ApiError(400, 'El alcance queda vacío'))

      const result = await tasksHttpService.complete('10', { excludedPlantIds: ['1'] })

      expect(result.error).toMatchObject({ code: ErrorCodes.VALIDATION_ERROR, message: 'El alcance queda vacío' })
    })
  })
})
