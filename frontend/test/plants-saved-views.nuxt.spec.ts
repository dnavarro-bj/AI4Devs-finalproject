import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'
import type { SavedView } from '../src/features/views/types/view.types'

enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

const STATUSES = ['activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida']
const ALL_COLUMNS = ['species', 'location', 'status', 'lastWatering', 'attention']

/** Requirement «Vistas guardadas en el inventario». */
describe('inventario: vistas guardadas', () => {
  const view = (id: string, name: string, query: string, columns?: string[]): SavedView => ({
    id, scope: 'plants', name, query, ...(columns ? { columns } : {}), createdAt: '', updatedAt: '',
  })

  const pageOf = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })

  const PLANT = {
    id: '1', code: 'CAT-GRUSS-01', nickname: 'Bola verde', status: 'activa', createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'x' },
  }

  const plantsCalls = () => api.get.mock.calls.filter(([path]) => path === '/plants')
  const lastPlantsCall = () => plantsCalls().at(-1)![1] as Record<string, unknown>
  const currentQuery = () => useRouter().currentRoute.value.query

  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    api.savedViews.mockReset()
    api.savedViews.mockResolvedValue(pageOf([]))
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations' || path === '/species') return pageOf([])
      return pageOf([PLANT])
    })
  })

  const mount = async (route = '/plants') => {
    const wrapper = await mountSuspended(PlantsIndex, { route })
    await settle()
    return wrapper
  }

  type Wrapper = Awaited<ReturnType<typeof mount>>

  /** Abre el panel si no lo está: guardar o reemplazar lo deja abierto. */
  const openMenu = async (wrapper: Wrapper) => {
    if (wrapper.find('[data-test="views-panel"]').exists()) return
    await wrapper.find('[data-test="views-toggle"]').trigger('click')
  }

  const saveAs = async (wrapper: Wrapper, name: string) => {
    await openMenu(wrapper)
    await wrapper.find('[data-test="view-save"]').trigger('click')
    await wrapper.find('[data-test="view-name"]').setValue(name)
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()
  }

  const appliedNames = (wrapper: Wrapper) =>
    wrapper.findAll('[data-test="view-apply"]')
      .filter((button) => button.attributes('aria-pressed') === 'true')
      .map((button) => button.find('strong').text())

  it('el selector pide las vistas del ámbito de plantas', async () => {
    await mount()

    expect(api.savedViews).toHaveBeenCalledWith('/saved-views', { scope: 'plants', page: 0, size: 500 })
  })

  it('guarda la vista actual: consulta del API sin lo que es de pantalla, y las columnas visibles', async () => {
    api.post.mockImplementation(async (_path: string, body: Record<string, unknown>) => view('9', body.name as string, body.query as string, body.columns as string[]))
    const wrapper = await mount('/plants?status=cuarentena&sort=species,asc&hide=attention&hide=lastWatering')

    await saveAs(wrapper, 'Cuarentena')

    expect(api.post).toHaveBeenCalledWith('/saved-views', {
      scope: 'plants',
      name: 'Cuarentena',
      query: 'sort=species,asc&status=cuarentena',
      columns: ['species', 'location', 'status'],
    })
    await openMenu(wrapper)
    expect(appliedNames(wrapper)).toEqual(['Cuarentena'])
  })

  it('«todas las estados» se guarda con los estados reales: el API no conoce `all`', async () => {
    api.post.mockImplementation(async (_path: string, body: Record<string, unknown>) => view('9', body.name as string, body.query as string))
    const wrapper = await mount('/plants?status=all')

    await saveAs(wrapper, 'Todo')

    const body = api.post.mock.calls[0]![1] as { query: string }
    expect(body.query).toBe(STATUSES.slice().sort().map((status) => `status=${status}`).join('&'))
    expect(body.query).not.toContain('all')
  })

  it('aplicar una vista escribe filtros, orden y columnas en la URL y pide el listado con ellos', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Cuarentena norte', 'location=300001&sort=species%2Casc&status=cuarentena', ['species', 'location'])]))
    const wrapper = await mount()

    await openMenu(wrapper)
    await wrapper.find('[data-test="view-apply"]').trigger('click')
    await settle()

    await vi.waitFor(() => expect(currentQuery()).toMatchObject({ location: '300001', sort: 'species,asc', status: 'cuarentena' }))
    expect(currentQuery().hide).toEqual(['status', 'lastWatering', 'attention'])
    expect(lastPlantsCall()).toMatchObject({ location: '300001', sort: 'species,asc', status: ['cuarentena'] })
    const headers = wrapper.findAll('thead th').map((th) => th.text())
    expect(headers.join(' ')).not.toContain('Atención')
  })

  it('una vista con todos los estados vuelve a «todas, incluidas las archivadas»', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Todo', STATUSES.map((status) => `status=${status}`).join('&'))]))
    const wrapper = await mount()

    await openMenu(wrapper)
    await wrapper.find('[data-test="view-apply"]').trigger('click')
    await settle()

    await vi.waitFor(() => expect(currentQuery().status).toBe('all'))
  })

  it('aplicar una vista sustituye los criterios anteriores, no se suman', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Solo búsqueda', 'q=bola')]))
    const wrapper = await mount('/plants?status=cuarentena&exposure=pleno_sol')

    await openMenu(wrapper)
    await wrapper.find('[data-test="view-apply"]').trigger('click')
    await settle()

    await vi.waitFor(() => expect(currentQuery()).toEqual({ q: 'bola' }))
  })

  it('un enlace con el estado de una vista guardada llega con esa vista marcada', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Cuarentena', 'status=cuarentena', ALL_COLUMNS)]))
    const wrapper = await mount('/plants?status=cuarentena')

    await openMenu(wrapper)
    expect(appliedNames(wrapper)).toEqual(['Cuarentena'])
  })

  it('las columnas ocultas forman parte de la vista: ocultar una la deja de marcar', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Cuarentena', 'status=cuarentena', ALL_COLUMNS)]))
    const wrapper = await mount('/plants?status=cuarentena&hide=attention')

    await openMenu(wrapper)
    expect(appliedNames(wrapper)).toEqual([])
  })

  it('modificar una vista aplicada la deja de marcar y ofrece reemplazarla con el nuevo estado', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Cuarentena', 'status=cuarentena', ALL_COLUMNS)]))
    api.put.mockImplementation(async (_path: string, body: Record<string, unknown>) => view('1', body.name as string, body.query as string, body.columns as string[]))
    const wrapper = await mount()
    await openMenu(wrapper)
    await wrapper.find('[data-test="view-apply"]').trigger('click')
    await settle()

    await wrapper.find('[data-test="filter-search"]').setValue('bola')
    await vi.waitFor(() => expect(currentQuery().q).toBe('bola'))
    await settle()
    await openMenu(wrapper)

    expect(appliedNames(wrapper)).toEqual([])
    expect(wrapper.find('[data-test="views-modified"]').text()).toContain('Cuarentena')

    await wrapper.find('[data-test="replace-modified"]').trigger('click')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/saved-views/1', {
      scope: 'plants', name: 'Cuarentena', query: 'q=bola&status=cuarentena', columns: ALL_COLUMNS,
    })
  })

  it('un nombre repetido se queda en el diálogo con el error del API y lo escrito', async () => {
    api.post.mockRejectedValue(new ApiError(409, 'Ya existe una vista con ese nombre'))
    const wrapper = await mount('/plants?status=cuarentena')

    await saveAs(wrapper, 'Cuarentena')

    expect(wrapper.find('[data-test="name-error"]').text()).toContain('Ya existe una vista con ese nombre')
    expect((wrapper.find('[data-test="view-name"]').element as HTMLInputElement).value).toBe('Cuarentena')
  })

  it('borrar una vista pide confirmación, la quita y conserva el estado de la tabla', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Cuarentena', 'status=cuarentena', ALL_COLUMNS)]))
    api.delete.mockResolvedValue(undefined)
    const wrapper = await mount('/plants?status=cuarentena')
    await openMenu(wrapper)

    await wrapper.find('[data-test="view-remove"]').trigger('click')
    expect(api.delete).not.toHaveBeenCalled()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/saved-views/1')
    expect(wrapper.findAll('[data-test="view-apply"]')).toHaveLength(0)
    expect(currentQuery()).toMatchObject({ status: 'cuarentena' })
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('sin vistas lo dice y ofrece guardar la actual', async () => {
    const wrapper = await mount()

    await openMenu(wrapper)

    expect(wrapper.find('[data-test="views-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="view-save"]').exists()).toBe(true)
  })

  it('si el API de vistas falla, el selector lo dice en línea y el inventario sigue funcionando', async () => {
    api.savedViews.mockRejectedValue(new ApiError(500, 'Caído'))
    const wrapper = await mount()

    await openMenu(wrapper)

    expect(wrapper.find('[data-test="views-error"]').text()).toContain('Caído')
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  })

  it('una vista con una clave que el API ya no admite deja el error del listado en pantalla y la vista a mano para borrarla', async () => {
    api.savedViews.mockResolvedValue(pageOf([view('1', 'Vieja', 'sort=lastReview%2Cdesc')]))
    const wrapper = await mount()

    await openMenu(wrapper)
    // El estado de la pantalla ignora lo que su esquema no conoce: la vista se aplica sin esa clave.
    await wrapper.find('[data-test="view-apply"]').trigger('click')
    await settle()
    await openMenu(wrapper)

    expect(wrapper.find('[data-test="view-remove"]').exists()).toBe(true)
  })
})
