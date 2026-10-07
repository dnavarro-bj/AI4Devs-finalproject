import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@shared/composables/useToast'
import { domainError, fail, ok } from '@shared/types/api.types'
import { batchesApiService } from '../services/batches.api.service'
import { useBatch } from './useBatch'

/**
 * El caso de uso de un lote: **el número lo da el servidor** antes de guardar, las exclusiones se
 * descuentan, un alcance vacío no se confirma y un error no pierde nada de lo escrito.
 */
describe('useBatch', () => {
  const batch = { id: '9', action: 'lectura', scopeKind: 'plantas', plantCount: 2, occurredAt: '2026-10-07T10:00:00Z' }
  const list = { kind: 'plants' as const, plantIds: ['1', '2', '3'] }

  beforeEach(() => useToast().clear())
  afterEach(() => vi.restoreAllMocks())

  it('al abrir con un alcance pide el número al servidor', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(3))
    const batchUse = useBatch()

    await batchUse.open(list)

    expect(preview).toHaveBeenCalledWith(list, [])
    expect(batchUse.count.value).toBe(3)
    expect(batchUse.canConfirm.value).toBe(true)
  })

  it('excluir una planta vuelve a preguntar y el número es el del servidor', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview')
      .mockResolvedValueOnce(ok(3))
      .mockResolvedValueOnce(ok(2))
    const batchUse = useBatch()
    await batchUse.open(list)

    await batchUse.toggle('2')

    expect(preview).toHaveBeenLastCalledWith(list, ['2'])
    expect(batchUse.count.value).toBe(2)
    expect(batchUse.excluded.has('2')).toBe(true)
  })

  it('volver a incluir una planta quita la exclusión', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(3))
    const batchUse = useBatch()
    await batchUse.open(list)

    await batchUse.toggle('2')
    await batchUse.toggle('2')

    expect(batchUse.excluded.size).toBe(0)
  })

  it('el alcance de una consulta se previsualiza con la consulta', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(486))
    const batchUse = useBatch()

    await batchUse.open({ kind: 'query', query: 'status=cuarentena' })

    expect(preview).toHaveBeenCalledWith({ kind: 'query', query: 'status=cuarentena' }, [])
    expect(batchUse.count.value).toBe(486)
  })

  it('sin alcance no pregunta: primero hay que elegir la localización', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(24))
    const batchUse = useBatch()

    await batchUse.open(null)

    expect(preview).not.toHaveBeenCalled()
    expect(batchUse.scope.value).toBeNull()
    expect(batchUse.canConfirm.value).toBe(false)

    await batchUse.chooseLocation('300001', true)

    expect(preview).toHaveBeenCalledWith({ kind: 'location', locationId: '300001', includeDescendants: true }, [])
    expect(batchUse.count.value).toBe(24)
  })

  it('cambiar si cuentan las sublocalizaciones vuelve a preguntar', async () => {
    const preview = vi.spyOn(batchesApiService, 'preview').mockResolvedValueOnce(ok(24)).mockResolvedValueOnce(ok(486))
    const batchUse = useBatch()
    await batchUse.open({ kind: 'location', locationId: '300001', includeDescendants: false })

    await batchUse.setDescendants(true)

    expect(preview).toHaveBeenLastCalledWith({ kind: 'location', locationId: '300001', includeDescendants: true }, [])
    expect(batchUse.count.value).toBe(486)
  })

  it('un alcance vacío no se puede confirmar', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(0))
    const batchUse = useBatch()

    await batchUse.open(list)

    expect(batchUse.count.value).toBe(0)
    expect(batchUse.canConfirm.value).toBe(false)
  })

  it('un alcance demasiado grande enseña el mensaje del servidor y no se puede confirmar', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(
      fail(domainError('VALIDATION', '3000 plantas superan el máximo de 2000: acota el alcance')),
    )
    const batchUse = useBatch()

    await batchUse.open({ kind: 'query', query: '' })

    expect(batchUse.error.value).toBe('3000 plantas superan el máximo de 2000: acota el alcance')
    expect(batchUse.count.value).toBeNull()
    expect(batchUse.canConfirm.value).toBe(false)
  })

  it('una respuesta tardía no pisa a la actual', async () => {
    let releaseFirst: (value: ReturnType<typeof ok<number>>) => void = () => {}
    vi.spyOn(batchesApiService, 'preview')
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve }))
      .mockResolvedValueOnce(ok(2))
    const batchUse = useBatch()

    const first = batchUse.open(list)
    await batchUse.toggle('1')
    releaseFirst(ok(3))
    await first

    expect(batchUse.count.value).toBe(2)
  })

  it('aplica con el alcance, las exclusiones y la acción, y avisa del número real', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValueOnce(ok(3)).mockResolvedValueOnce(ok(2))
    const apply = vi.spyOn(batchesApiService, 'apply').mockResolvedValue(ok(batch))
    const batchUse = useBatch()
    await batchUse.open(list)
    await batchUse.toggle('2')

    const done = await batchUse.apply({ kind: 'reading', reading: { waterAmountMl: 200 } }, '2026-10-07T10:00:00Z')

    expect(apply).toHaveBeenCalledWith({
      scope: list,
      excludedPlantIds: ['2'],
      occurredAt: '2026-10-07T10:00:00Z',
      action: { kind: 'reading', reading: { waterAmountMl: 200 } },
    })
    expect(done).toEqual(batch)
    expect(useToast().toasts.value.map((toast) => toast.message)).toEqual(['Lectura registrada en 2 plantas'])
  })

  it('un error al aplicar se explica y no pierde exclusiones ni alcance', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(3))
    vi.spyOn(batchesApiService, 'apply').mockResolvedValue(fail(domainError('VALIDATION', 'La lectura debe llevar al menos un valor')))
    const batchUse = useBatch()
    await batchUse.open(list)
    await batchUse.toggle('2')

    const done = await batchUse.apply({ kind: 'reading', reading: {} })

    expect(done).toBeNull()
    expect(batchUse.error.value).toBe('La lectura debe llevar al menos un valor')
    expect(batchUse.excluded.has('2')).toBe(true)
    expect(batchUse.scope.value).toEqual(list)
    expect(batchUse.applying.value).toBe(false)
  })

  it('no aplica dos veces a la vez', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(3))
    let release: (value: ReturnType<typeof ok<typeof batch>>) => void = () => {}
    const apply = vi.spyOn(batchesApiService, 'apply').mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const batchUse = useBatch()
    await batchUse.open(list)

    const first = batchUse.apply({ kind: 'comment', comment: { text: 'a' } })
    const second = await batchUse.apply({ kind: 'comment', comment: { text: 'a' } })
    release(ok(batch))
    await first

    expect(second).toBeNull()
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('abrir de nuevo empieza sin exclusiones ni errores', async () => {
    vi.spyOn(batchesApiService, 'preview').mockResolvedValue(ok(3))
    const batchUse = useBatch()
    await batchUse.open(list)
    await batchUse.toggle('2')

    await batchUse.open(list)

    expect(batchUse.excluded.size).toBe(0)
    expect(batchUse.error.value).toBeNull()
  })
})
