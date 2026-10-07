import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble } from '../../../../test/helpers/apiDouble'
import type { SavedView, ViewDraft } from '../types/view.types'
import { useSavedViews } from './useSavedViews'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * El caso de uso de las vistas de una pantalla: listar, guardar el estado actual, aplicar,
 * reemplazar, renombrar y borrar. «Aplicada» es una **derivación** del estado de la pantalla, no
 * algo que se recuerde: si se cambia un criterio la marca se pierde sola.
 */
describe('useSavedViews', () => {
  const view = (id: string, name: string, query: string, over: Partial<SavedView> = {}): SavedView => ({
    id, scope: 'plants', name, query, createdAt: '2026-10-07T10:00:00Z', updatedAt: '2026-10-07T10:00:00Z', ...over,
  })

  const page = (content: SavedView[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 500 })

  /** La pantalla: un estado reactivo que se traduce a un borrador y al que se aplica una vista. */
  function screen() {
    const state = reactive({ query: '' })
    const applied: SavedView[] = []
    const adapter = {
      current: (): ViewDraft => ({ query: state.query }),
      apply: vi.fn((next: SavedView) => { state.query = next.query; applied.push(next) }),
    }
    return { state, adapter, applied }
  }

  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  it('carga las vistas de su ámbito, ordenadas por nombre', async () => {
    api.get.mockResolvedValue(page([view('2', 'Zonas', 'a=1'), view('1', 'Cuarentena', 'status=cuarentena')]))
    const { adapter } = screen()
    const views = useSavedViews('plants', adapter)

    await views.load()

    expect(api.get).toHaveBeenCalledWith('/saved-views', { scope: 'plants', page: 0, size: 500 })
    expect(views.views.value.map((item) => item.name)).toEqual(['Cuarentena', 'Zonas'])
    expect(views.loading.value).toBe(false)
    expect(views.loadError.value).toBeNull()
  })

  it('un fallo al cargar se queda en `loadError` y no lanza', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'Caído'))
    const views = useSavedViews('plants', screen().adapter)

    await views.load()

    expect(views.loadError.value).toBe('Caído')
    expect(views.views.value).toEqual([])
  })

  it('guarda el estado actual con un nombre y lo deja marcado como aplicado', async () => {
    api.get.mockResolvedValue(page([]))
    const { state, adapter } = screen()
    state.query = 'status=cuarentena'
    api.post.mockImplementation(async (_path: string, body: Record<string, unknown>) => view('9', body.name as string, body.query as string))
    const views = useSavedViews('plants', adapter)
    await views.load()

    const result = await views.saveCurrent('Cuarentena')

    expect(api.post).toHaveBeenCalledWith('/saved-views', { scope: 'plants', name: 'Cuarentena', query: 'status=cuarentena' })
    expect(result.success).toBe(true)
    expect(views.views.value.map((item) => item.name)).toEqual(['Cuarentena'])
    expect(views.applied.value?.id).toBe('9')
  })

  it('el nombre se recorta antes de enviarse', async () => {
    api.get.mockResolvedValue(page([]))
    api.post.mockImplementation(async (_path: string, body: Record<string, unknown>) => view('9', body.name as string, ''))
    const views = useSavedViews('plants', screen().adapter)

    await views.saveCurrent('  Cuarentena  ')

    expect(api.post).toHaveBeenCalledWith('/saved-views', expect.objectContaining({ name: 'Cuarentena' }))
  })

  it('un nombre repetido devuelve el error del API y no añade nada', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'a=1')]))
    api.post.mockRejectedValue(new ApiError(409, 'Ya existe'))
    const views = useSavedViews('plants', screen().adapter)
    await views.load()

    const result = await views.saveCurrent('Cuarentena')

    expect(result.success).toBe(false)
    expect(result.error?.message).toBe('Ya existe')
    expect(views.views.value).toHaveLength(1)
  })

  it('aplicar una vista la entrega a la pantalla y queda aplicada', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'status=cuarentena')]))
    const { adapter, state } = screen()
    const views = useSavedViews('plants', adapter)
    await views.load()

    views.apply(views.views.value[0]!)

    expect(adapter.apply).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))
    expect(state.query).toBe('status=cuarentena')
    expect(views.applied.value?.id).toBe('1')
    expect(views.modified.value).toBeNull()
  })

  it('«aplicada» es una derivación: cambiar un criterio la pierde y señala la vista modificada', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'status=cuarentena')]))
    const { adapter, state } = screen()
    const views = useSavedViews('plants', adapter)
    await views.load()
    views.apply(views.views.value[0]!)

    state.query = 'status=cuarentena&q=bola'

    expect(views.applied.value).toBeNull()
    expect(views.modified.value?.id).toBe('1')
  })

  it('volver al estado de la vista a mano la deja aplicada otra vez', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'status=cuarentena')]))
    const { adapter, state } = screen()
    const views = useSavedViews('plants', adapter)
    await views.load()

    state.query = 'status=cuarentena'

    expect(views.applied.value?.id).toBe('1')
  })

  it('una vista no aplicada nunca es «modificada»: solo lo es la última que se aplicó', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'status=cuarentena')]))
    const { state, adapter } = screen()
    const views = useSavedViews('plants', adapter)
    await views.load()

    state.query = 'q=otra-cosa'

    expect(views.modified.value).toBeNull()
  })

  it('reemplazar una vista con el estado actual la sobrescribe entera', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'status=cuarentena')]))
    const { state, adapter } = screen()
    api.put.mockImplementation(async (_path: string, body: Record<string, unknown>) => view('1', body.name as string, body.query as string))
    const views = useSavedViews('plants', adapter)
    await views.load()
    state.query = 'status=enferma'

    const result = await views.replaceWithCurrent(views.views.value[0]!)

    expect(api.put).toHaveBeenCalledWith('/saved-views/1', { scope: 'plants', name: 'Cuarentena', query: 'status=enferma' })
    expect(result.success).toBe(true)
    expect(views.views.value[0]!.query).toBe('status=enferma')
    expect(views.applied.value?.id).toBe('1')
  })

  it('renombrar conserva la consulta y las columnas', async () => {
    api.get.mockResolvedValue(page([view('1', 'Vieja', 'status=cuarentena', { columns: ['species'] })]))
    api.put.mockImplementation(async (_path: string, body: Record<string, unknown>) =>
      view('1', body.name as string, body.query as string, { columns: body.columns as string[] }))
    const views = useSavedViews('plants', screen().adapter)
    await views.load()

    await views.rename(views.views.value[0]!, 'Nueva')

    expect(api.put).toHaveBeenCalledWith('/saved-views/1', { scope: 'plants', name: 'Nueva', query: 'status=cuarentena', columns: ['species'] })
    expect(views.views.value[0]!.name).toBe('Nueva')
  })

  it('borrar quita la vista de la lista y no toca el estado de la pantalla', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'status=cuarentena'), view('2', 'Otra', 'q=x')]))
    api.delete.mockResolvedValue(undefined)
    const { state, adapter } = screen()
    const views = useSavedViews('plants', adapter)
    await views.load()
    views.apply(views.views.value[0]!)

    const result = await views.remove(views.views.value[0]!)

    expect(result.success).toBe(true)
    expect(views.views.value.map((item) => item.id)).toEqual(['2'])
    expect(state.query).toBe('status=cuarentena')
    expect(views.applied.value).toBeNull()
  })

  it('un fallo al borrar deja la lista como estaba', async () => {
    api.get.mockResolvedValue(page([view('1', 'Cuarentena', 'a=1')]))
    api.delete.mockRejectedValue(new ApiError(500, 'Caído'))
    const views = useSavedViews('plants', screen().adapter)
    await views.load()

    const result = await views.remove(views.views.value[0]!)

    expect(result.success).toBe(false)
    expect(views.views.value).toHaveLength(1)
  })

  it('una vista cuyo valor se retiró al aplicarla: el error del listado lo muestra la pantalla, la vista sigue ahí', async () => {
    api.get.mockResolvedValue(page([view('1', 'Vieja', 'sort=lastReview%2Cdesc')]))
    const views = useSavedViews('plants', screen().adapter)
    await views.load()

    views.apply(views.views.value[0]!)

    expect(views.views.value).toHaveLength(1)
  })

  it('el ámbito de species trae el recuento de cada grupo tal cual lo da el API', async () => {
    api.get.mockResolvedValue(page([view('1', 'Sensibles al frío', 'minTemperatureFrom=9', { scope: 'species', matchCount: 12 })]))
    const views = useSavedViews('species', screen().adapter)

    await views.load()

    expect(api.get).toHaveBeenCalledWith('/saved-views', { scope: 'species', page: 0, size: 500 })
    expect(views.views.value[0]!.matchCount).toBe(12)
  })
})
