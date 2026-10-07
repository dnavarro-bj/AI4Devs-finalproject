import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { ErrorCodes } from '@shared/types/api.types'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { mediaApiService } from './media.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

const plant = { kind: 'plants', id: '300001' } as const
const species = { kind: 'species', id: '200001' } as const
const page = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 }

describe('service de fotografías', () => {
  beforeEach(() => {
    for (const fn of [api.get, api.post, api.postForm, api.put, api.delete]) fn.mockReset()
  })

  it('lista la galería paginada de la especie o del ejemplar', async () => {
    api.get.mockResolvedValue(page)

    await mediaApiService.list(species, { page: 2 })
    await mediaApiService.list(plant)

    expect(api.get).toHaveBeenNthCalledWith(1, '/species/200001/photos', { page: 2 })
    expect(api.get).toHaveBeenNthCalledWith(2, '/plants/300001/photos', { page: 0 })
  })

  it('pasa el orden manual y los filtros del ejemplar, y omite lo ausente', async () => {
    api.get.mockResolvedValue(page)

    await mediaApiService.list(plant, { sort: 'position', purpose: 'detalle', event: '77' })

    expect(api.get).toHaveBeenCalledWith('/plants/300001/photos', {
      page: 0, sort: 'position', purpose: 'detalle', event: '77',
    })
  })

  it('sube los archivos como multipart con los campos que valen para toda la subida', async () => {
    api.postForm.mockResolvedValue([{ id: '1' }])
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
    const b = new File(['b'], 'b.png', { type: 'image/png' })

    const result = await mediaApiService.upload(plant, [a, b], { purpose: 'detalle', eventId: '77', altText: '' })

    const [path, form] = api.postForm.mock.calls[0] as [string, FormData]
    expect(path).toBe('/plants/300001/photos')
    expect(form.getAll('files')).toHaveLength(2)
    expect(form.get('purpose')).toBe('detalle')
    expect(form.get('eventId')).toBe('77')
    // Un texto vacío no es un campo: el servidor pondría su texto por defecto.
    expect(form.has('altText')).toBe(false)
    expect(result.data).toEqual([{ id: '1' }])
  })

  it('corrige con un cuerpo parcial', async () => {
    api.put.mockResolvedValue({ id: '5' })

    await mediaApiService.update(species, '5', { primary: true })
    await mediaApiService.update(plant, '5', { eventId: null })

    expect(api.put).toHaveBeenNthCalledWith(1, '/species/200001/photos/5', { primary: true })
    expect(api.put).toHaveBeenNthCalledWith(2, '/plants/300001/photos/5', { eventId: null })
  })

  it('reordena enviando la lista entera', async () => {
    api.put.mockResolvedValue([])

    await mediaApiService.reorder(species, ['3', '1', '2'])

    expect(api.put).toHaveBeenCalledWith('/species/200001/photos/order', { ids: ['3', '1', '2'] })
  })

  it('borra con DELETE', async () => {
    api.delete.mockResolvedValue(undefined)

    const result = await mediaApiService.remove(plant, '5')

    expect(api.delete).toHaveBeenCalledWith('/plants/300001/photos/5')
    expect(result.success).toBe(true)
  })

  /** Ningún método lanza: el fallo viaja como valor (ADR-015). */
  it('devuelve el error como valor, sin lanzar', async () => {
    api.postForm.mockRejectedValue(new ApiError(400, 'No es una imagen admitida'))
    api.get.mockRejectedValue(new ApiError(404, 'No existe'))

    const upload = await mediaApiService.upload(plant, [new File(['x'], 'a.jpg')])
    const list = await mediaApiService.list(plant)

    expect(upload.success).toBe(false)
    expect(upload.error).toMatchObject({ code: ErrorCodes.VALIDATION_ERROR, message: 'No es una imagen admitida' })
    expect(list.error!.code).toBe(ErrorCodes.NOT_FOUND)
  })
})
