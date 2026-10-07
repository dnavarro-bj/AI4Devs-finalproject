import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, fail } from '@shared/types/api.types'
import type { MediaPhoto } from '../types/media.types'

const service = vi.hoisted(() => ({ list: vi.fn(), upload: vi.fn(), update: vi.fn(), reorder: vi.fn(), remove: vi.fn() }))
vi.mock('../services/media.api.service', () => ({ mediaApiService: service }))

import { useMediaGallery } from './useMediaGallery'

const owner = { kind: 'plants', id: '7' } as const

const photo = (id: string, extra: Partial<MediaPhoto> = {}): MediaPhoto => ({
  id, altText: `Foto ${id}`, width: 100, height: 100, contentType: 'image/jpeg',
  capturedAt: null, createdAt: '2026-09-01T10:00:00Z', position: Number(id), primary: id === '1',
  urls: { thumb: `/media/${id}/thumb`, medium: `/media/${id}/medium`, full: `/media/${id}/full` },
  ...extra,
})

const page = (content: MediaPhoto[]) =>
  ok({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 50 })

const file = (name: string, type = 'image/jpeg', size = 1000) => {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('useMediaGallery', () => {
  beforeEach(() => Object.values(service).forEach((fn) => fn.mockReset()))

  it('carga la galería entera, hasta el límite por dueño, y cuenta las fotos', async () => {
    service.list.mockResolvedValue(page([photo('1'), photo('2')]))
    const gallery = useMediaGallery(owner)

    await gallery.load()

    expect(service.list).toHaveBeenCalledWith(owner, { page: 0, size: 50 })
    expect(gallery.photos.value).toHaveLength(2)
    expect(gallery.total.value).toBe(2)
    expect(gallery.images.value[0]!.src).toBe('http://localhost:8080/media/1/medium')
  })

  it('pide el orden manual cuando se le indica', async () => {
    service.list.mockResolvedValue(page([]))
    const gallery = useMediaGallery(owner, { sort: 'position' })

    await gallery.load()

    expect(service.list).toHaveBeenCalledWith(owner, { page: 0, size: 50, sort: 'position' })
  })

  it('un fallo al cargar queda como error con reintento, sin lanzar', async () => {
    service.list.mockResolvedValueOnce(fail({ code: 'NETWORK_ERROR', message: 'Sin conexión' }))
    service.list.mockResolvedValueOnce(page([photo('1')]))
    const gallery = useMediaGallery(owner)

    await gallery.load()
    expect(gallery.error.value).toBe('Sin conexión')

    await gallery.load()
    expect(gallery.error.value).toBeNull()
    expect(gallery.photos.value).toHaveLength(1)
  })

  it('sube cada archivo en su petición y recarga al terminar', async () => {
    service.list.mockResolvedValue(page([photo('1'), photo('2')]))
    service.upload.mockResolvedValue(ok([photo('1')]))
    const gallery = useMediaGallery(owner)

    const result = await gallery.upload([file('a.jpg'), file('b.jpg')], { purpose: 'detalle' })

    expect(service.upload).toHaveBeenCalledTimes(2)
    expect(service.upload).toHaveBeenNthCalledWith(1, owner, [expect.objectContaining({ name: 'a.jpg' })], { purpose: 'detalle' })
    expect(result).toEqual({ uploaded: 2, failed: 0 })
    expect(gallery.uploads.value).toEqual([])
    expect(service.list).toHaveBeenCalled()
  })

  it('el estado de cada archivo es «subiendo» mientras dura su petición', async () => {
    let release!: (value: unknown) => void
    service.upload.mockReturnValue(new Promise((resolve) => { release = resolve }))
    service.list.mockResolvedValue(page([]))
    const gallery = useMediaGallery(owner)

    const pending = gallery.upload([file('a.jpg')])
    await Promise.resolve()

    expect(gallery.uploads.value).toMatchObject([{ name: 'a.jpg', status: 'uploading' }])
    expect(gallery.images.value.at(-1)).toMatchObject({ status: 'uploading' })

    release(ok([photo('1')]))
    await pending
    expect(gallery.uploads.value).toEqual([])
  })

  it('un fallo no pierde los demás: el fallido queda con su motivo y el resto se sube', async () => {
    service.upload
      .mockResolvedValueOnce(ok([photo('1')]))
      .mockResolvedValueOnce(fail({ code: 'VALIDATION_ERROR', message: 'No es una imagen admitida' }))
      .mockResolvedValueOnce(ok([photo('3')]))
    service.list.mockResolvedValue(page([photo('1'), photo('3')]))
    const gallery = useMediaGallery(owner)

    const result = await gallery.upload([file('a.jpg'), file('b.jpg'), file('c.jpg')])

    expect(result).toEqual({ uploaded: 2, failed: 1 })
    expect(gallery.uploads.value).toMatchObject([{ name: 'b.jpg', status: 'error', message: 'No es una imagen admitida' }])
    expect(gallery.images.value.at(-1)).toMatchObject({ status: 'error', statusText: expect.stringContaining('No es una imagen admitida') })
  })

  it('rechaza antes de enviar lo que no es una imagen admitida y lo cuenta como fallo', async () => {
    service.list.mockResolvedValue(page([]))
    const gallery = useMediaGallery(owner)

    const result = await gallery.upload([file('a.gif', 'image/gif')])

    expect(service.upload).not.toHaveBeenCalled()
    expect(result).toEqual({ uploaded: 0, failed: 1 })
    expect(gallery.uploads.value[0]!.message).toContain('JPEG, PNG o WebP')
  })

  it('descartar un archivo fallido lo quita de la lista', async () => {
    service.list.mockResolvedValue(page([]))
    const gallery = useMediaGallery(owner)
    await gallery.upload([file('a.gif', 'image/gif')])

    gallery.dismissUpload(gallery.uploads.value[0]!.key)

    expect(gallery.uploads.value).toEqual([])
  })

  it('elige la principal y recarga', async () => {
    service.update.mockResolvedValue(ok(photo('2')))
    service.list.mockResolvedValue(page([photo('1', { primary: false }), photo('2', { primary: true })]))
    const gallery = useMediaGallery(owner)

    await gallery.makePrimary('2')

    expect(service.update).toHaveBeenCalledWith(owner, '2', { primary: true })
    expect(gallery.photos.value.find((p) => p.primary)!.id).toBe('2')
  })

  it('corrige texto y fecha', async () => {
    service.update.mockResolvedValue(ok(photo('2')))
    service.list.mockResolvedValue(page([photo('2')]))
    const gallery = useMediaGallery(owner)

    const result = await gallery.update('2', { altText: 'Nuevo' })

    expect(service.update).toHaveBeenCalledWith(owner, '2', { altText: 'Nuevo' })
    expect(result.success).toBe(true)
  })

  it('reordena de forma optimista y lo deshace si el servidor lo rechaza', async () => {
    service.list.mockResolvedValue(page([photo('1'), photo('2'), photo('3')]))
    const gallery = useMediaGallery(owner)
    await gallery.load()
    service.reorder.mockResolvedValue(fail({ code: 'VALIDATION_ERROR', message: 'Orden incompleto' }))

    const pending = gallery.reorder(['3', '1', '2'])
    expect(gallery.photos.value.map((p) => p.id)).toEqual(['3', '1', '2'])
    await pending

    expect(service.reorder).toHaveBeenCalledWith(owner, ['3', '1', '2'])
    expect(gallery.photos.value.map((p) => p.id)).toEqual(['1', '2', '3'])
    expect(gallery.error.value).toBe('Orden incompleto')
  })

  it('borra y baja el recuento', async () => {
    service.list
      .mockResolvedValueOnce(page([photo('1'), photo('2')]))
      .mockResolvedValueOnce(page([photo('2', { primary: true })]))
    service.remove.mockResolvedValue(ok(null))
    const gallery = useMediaGallery(owner)
    await gallery.load()

    await gallery.remove('1')

    expect(service.remove).toHaveBeenCalledWith(owner, '1')
    expect(gallery.total.value).toBe(1)
  })

  it('un borrado fallido queda como error y no quita la foto', async () => {
    service.list.mockResolvedValue(page([photo('1')]))
    service.remove.mockResolvedValue(fail({ code: 'SERVER_ERROR', message: 'Error del servidor' }))
    const gallery = useMediaGallery(owner)
    await gallery.load()

    const result = await gallery.remove('1')

    expect(result.success).toBe(false)
    expect(gallery.photos.value).toHaveLength(1)
    expect(gallery.actionError.value).toBe('Error del servidor')
  })
})
