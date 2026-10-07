import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, fail } from '@shared/types/api.types'

const service = vi.hoisted(() => ({ upload: vi.fn() }))
vi.mock('../services/media.api.service', () => ({ mediaApiService: service }))

import { usePendingUploads } from './usePendingUploads'

const owner = { kind: 'plants', id: '7' } as const
const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type })

describe('usePendingUploads', () => {
  beforeEach(() => {
    service.upload.mockReset()
    const { discardAll } = usePendingUploads()
    discardAll()
  })

  it('sube cada archivo después de guardar, con los campos que le corresponden', async () => {
    service.upload.mockResolvedValue(ok([]))
    const { uploadAfterSave } = usePendingUploads()

    const result = await uploadAfterSave(owner, [file('a.jpg'), file('b.jpg')], { purpose: 'detalle' })

    expect(service.upload).toHaveBeenCalledTimes(2)
    expect(service.upload).toHaveBeenCalledWith(owner, [expect.objectContaining({ name: 'a.jpg' })], { purpose: 'detalle' })
    expect(result).toEqual({ uploaded: 2, failed: 0 })
  })

  it('un fallo no bloquea: no lanza, sigue con el resto y deja lo no subido en la cola', async () => {
    service.upload
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(fail({ code: 'SERVER_ERROR', message: 'Error del servidor' }))
    const { uploadAfterSave, pendingFor } = usePendingUploads()

    const result = await uploadAfterSave(owner, [file('a.jpg'), file('b.jpg')])

    expect(result).toEqual({ uploaded: 1, failed: 1 })
    expect(pendingFor(owner).value).toMatchObject([{ name: 'b.jpg', message: 'Error del servidor' }])
  })

  it('un archivo que no es admitido ni se envía y queda avisado', async () => {
    const { uploadAfterSave, pendingFor } = usePendingUploads()

    const result = await uploadAfterSave(owner, [file('a.gif', 'image/gif')])

    expect(service.upload).not.toHaveBeenCalled()
    expect(result).toEqual({ uploaded: 0, failed: 1 })
    expect(pendingFor(owner).value[0]!.message).toContain('JPEG, PNG o WebP')
  })

  it('lo no subido es del dueño y no de otro', async () => {
    service.upload.mockResolvedValue(fail({ code: 'SERVER_ERROR', message: 'x' }))
    const { uploadAfterSave, pendingFor } = usePendingUploads()

    await uploadAfterSave(owner, [file('a.jpg')])

    expect(pendingFor(owner).value).toHaveLength(1)
    expect(pendingFor({ kind: 'plants', id: '8' }).value).toHaveLength(0)
  })

  it('reintenta lo pendiente desde la ficha y lo saca de la cola cuando sube', async () => {
    service.upload.mockResolvedValueOnce(fail({ code: 'SERVER_ERROR', message: 'x' }))
    const { uploadAfterSave, retry, pendingFor } = usePendingUploads()
    await uploadAfterSave(owner, [file('a.jpg')], { purpose: 'general' })

    service.upload.mockResolvedValueOnce(ok([]))
    const result = await retry(owner)

    expect(service.upload).toHaveBeenLastCalledWith(owner, [expect.objectContaining({ name: 'a.jpg' })], { purpose: 'general' })
    expect(result).toEqual({ uploaded: 1, failed: 0 })
    expect(pendingFor(owner).value).toEqual([])
  })

  it('descartar vacía la cola del dueño', async () => {
    service.upload.mockResolvedValue(fail({ code: 'SERVER_ERROR', message: 'x' }))
    const { uploadAfterSave, discard, pendingFor } = usePendingUploads()
    await uploadAfterSave(owner, [file('a.jpg')])

    discard(owner)

    expect(pendingFor(owner).value).toEqual([])
  })
})
