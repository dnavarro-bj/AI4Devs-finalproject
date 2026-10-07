import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import { batchesApiService } from './batches.api.service'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** El contrato del service de lotes: previsualiza y aplica, y **nunca lanza**. */
describe('batchesApiService', () => {
  beforeEach(() => {
    api.post.mockReset()
  })

  it('previsualiza con el alcance y sin acción', async () => {
    api.post.mockResolvedValue({ count: 24 })

    const result = await batchesApiService.preview({ kind: 'location', locationId: '300001', includeDescendants: true }, [])

    expect(api.post).toHaveBeenCalledWith('/batches/preview', {
      scope: { kind: 'location', locationId: '300001', includeDescendants: true },
    })
    expect(result.success).toBe(true)
    expect(result.data).toBe(24)
  })

  it('las exclusiones viajan solo si las hay', async () => {
    api.post.mockResolvedValue({ count: 21 })

    await batchesApiService.preview({ kind: 'plants', plantIds: ['1', '2', '3'] }, ['2'])

    expect(api.post).toHaveBeenCalledWith('/batches/preview', {
      scope: { kind: 'plants', plantIds: ['1', '2', '3'] },
      excludedPlantIds: ['2'],
    })
  })

  it('el alcance de una consulta viaja como cadena, no como identificadores', async () => {
    api.post.mockResolvedValue({ count: 486 })

    await batchesApiService.preview({ kind: 'query', query: 'status=cuarentena&species=200001' }, [])

    expect(api.post).toHaveBeenCalledWith('/batches/preview', {
      scope: { kind: 'query', query: 'status=cuarentena&species=200001' },
    })
  })

  it('aplica una lectura con el alcance, las exclusiones y el instante', async () => {
    const batch = { id: '9', action: 'lectura', scopeKind: 'localizacion', plantCount: 21, occurredAt: '2026-10-07T10:00:00Z' }
    api.post.mockResolvedValue(batch)

    const result = await batchesApiService.apply({
      scope: { kind: 'location', locationId: '300001' },
      excludedPlantIds: ['5'],
      occurredAt: '2026-10-07T10:00:00Z',
      action: { kind: 'reading', reading: { waterAmountMl: 200 } },
    })

    expect(api.post).toHaveBeenCalledWith('/batches', {
      scope: { kind: 'location', locationId: '300001' },
      excludedPlantIds: ['5'],
      occurredAt: '2026-10-07T10:00:00Z',
      reading: { waterAmountMl: 200 },
    })
    expect(result.data).toEqual(batch)
  })

  it('lo que no se informa no viaja', async () => {
    api.post.mockResolvedValue({ id: '1', action: 'comentario', scopeKind: 'plantas', plantCount: 2, occurredAt: 'x' })

    await batchesApiService.apply({
      scope: { kind: 'plants', plantIds: ['1', '2'] },
      action: { kind: 'comment', comment: { text: 'movidas por el frío' } },
    })

    expect(api.post).toHaveBeenCalledWith('/batches', {
      scope: { kind: 'plants', plantIds: ['1', '2'] },
      comment: { text: 'movidas por el frío' },
    })
  })

  it('el cuerpo no lleva `action` y trae exactamente un objeto: reading, intervention o comment', async () => {
    api.post.mockResolvedValue({ id: '1', action: 'intervencion', scopeKind: 'plantas', plantCount: 1, occurredAt: 'x' })

    await batchesApiService.apply({
      scope: { kind: 'plants', plantIds: ['1'] },
      action: { kind: 'intervention', intervention: { type: 'poda', notes: 'raíces' } },
    })

    const body = api.post.mock.calls.at(-1)![1] as Record<string, unknown>
    expect(body).not.toHaveProperty('action')
    expect(Object.keys(body).filter((key) => ['reading', 'intervention', 'comment'].includes(key))).toEqual(['intervention'])
    expect(body.intervention).toEqual({ type: 'poda', notes: 'raíces' })
  })

  it('con el alcance de una consulta no viajan exclusiones, ni al previsualizar ni al aplicar', async () => {
    api.post.mockResolvedValue({ count: 486 })
    await batchesApiService.preview({ kind: 'query', query: 'status=cuarentena' }, ['3'])
    expect(api.post).toHaveBeenLastCalledWith('/batches/preview', { scope: { kind: 'query', query: 'status=cuarentena' } })

    api.post.mockResolvedValue({ id: '1', action: 'comentario', scopeKind: 'consulta', plantCount: 486, occurredAt: 'x' })
    await batchesApiService.apply({
      scope: { kind: 'query', query: 'status=cuarentena' },
      excludedPlantIds: ['3'],
      action: { kind: 'comment', comment: { text: 'a' } },
    })
    expect(api.post).toHaveBeenLastCalledWith('/batches', {
      scope: { kind: 'query', query: 'status=cuarentena' },
      comment: { text: 'a' },
    })
  })

  it('un alcance demasiado grande llega como error con su mensaje, sin lanzar', async () => {
    api.post.mockRejectedValue(new ApiError(422, '3000 plantas superan el máximo de 2000: acota el alcance'))

    const result = await batchesApiService.preview({ kind: 'query', query: '' }, [])

    expect(result.success).toBe(false)
    expect(result.error!.message).toBe('3000 plantas superan el máximo de 2000: acota el alcance')
  })

  it('una acción inválida llega como error al aplicar', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'La lectura debe llevar al menos un valor'))

    const result = await batchesApiService.apply({
      scope: { kind: 'plants', plantIds: ['1'] },
      action: { kind: 'reading', reading: {} },
    })

    expect(result.success).toBe(false)
    expect(result.error!.message).toBe('La lectura debe llevar al menos un valor')
  })
})
