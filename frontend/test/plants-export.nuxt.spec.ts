import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { downloadBlob } from '@shared/utils/downloadBlob'
import { useToast } from '@shared/composables/useToast'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'

vi.mock('@shared/utils/downloadBlob', () => ({ downloadBlob: vi.fn() }))

enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

const STATUSES = ['activa', 'cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida']

/** Requirement «Exportar el resultado filtrado desde el inventario y el catálogo», lado inventario. */
describe('inventario: exportar el resultado filtrado', () => {
  const PLANT = {
    id: '1', code: 'CAT-GRUSS-01', nickname: 'Bola verde', status: 'activa', createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'x' },
  }
  const file = { blob: new Blob(['a']), filename: 'cactify-plantas-2026-10-07.csv' }

  const pageOf = (content: unknown[], totalElements = content.length) =>
    ({ content, totalElements, totalPages: 1, pageNumber: 0, pageSize: 25 })

  /** El número de resultados que dice la tabla. */
  let total = 1

  beforeEach(() => {
    total = 1
    api.get.mockReset()
    api.getBlob.mockReset()
    api.savedViews.mockReset()
    api.savedViews.mockResolvedValue(pageOf([]))
    api.getBlob.mockResolvedValue(file)
    vi.mocked(downloadBlob).mockReset()
    useToast().clear()
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations' || path === '/species') return pageOf([])
      return pageOf(total ? [PLANT] : [], total)
    })
  })

  const mount = async (route = '/plants') => {
    const wrapper = await mountSuspended(PlantsIndex, { route })
    await settle()
    return wrapper
  }
  type Wrapper = Awaited<ReturnType<typeof mount>>
  const button = (wrapper: Wrapper) => wrapper.find('[data-test="export"]')

  it('declara su alcance antes de ejecutar: el recuento que ya muestra la tabla', async () => {
    total = 486
    const wrapper = await mount()

    expect(button(wrapper).text()).toContain('Exportar 486 resultados')
  })

  it('con un solo resultado, en singular', async () => {
    const wrapper = await mount()

    expect(button(wrapper).text()).toContain('Exportar 1 resultado')
    expect(button(wrapper).text()).not.toContain('resultados')
  })

  it('descarga el CSV con los filtros y el orden de la URL, y lo confirma con un aviso', async () => {
    total = 7
    const wrapper = await mount('/plants?q=gruss&status=cuarentena&sort=species,asc')

    await button(wrapper).trigger('click')
    await settle()

    expect(api.getBlob).toHaveBeenCalledWith('/plants/export?q=gruss&sort=species,asc&status=cuarentena')
    expect(downloadBlob).toHaveBeenCalledWith(file.blob, 'cactify-plantas-2026-10-07.csv')
    expect(useToast().toasts.value.map((toast) => toast.message)).toEqual([
      'Exportación lista: cactify-plantas-2026-10-07.csv',
    ])
  })

  it('el pseudo-estado «todas» viaja con los estados reales: el API no conoce `all`', async () => {
    const wrapper = await mount('/plants?status=all')

    await button(wrapper).trigger('click')
    await settle()

    const path = api.getBlob.mock.calls[0]![0] as string
    expect(path).toBe(`/plants/export?${STATUSES.slice().sort().map((status) => `status=${status}`).join('&')}`)
    expect(path).not.toContain('all')
  })

  it('las columnas ocultas son presentación: no viajan', async () => {
    const wrapper = await mount('/plants?hide=attention&hide=lastWatering&location=300001')

    await button(wrapper).trigger('click')
    await settle()

    expect(api.getBlob).toHaveBeenCalledWith('/plants/export?location=300001')
  })

  it('sin criterios exporta lo mismo que lista: el estado por defecto lo decide el servidor', async () => {
    const wrapper = await mount()

    await button(wrapper).trigger('click')
    await settle()

    expect(api.getBlob).toHaveBeenCalledWith('/plants/export')
  })

  it('una sola petición: un segundo clic mientras exporta no pide otra', async () => {
    let release!: (value: typeof file) => void
    api.getBlob.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const wrapper = await mount()

    await button(wrapper).trigger('click')
    expect(button(wrapper).attributes('disabled')).toBeDefined()
    expect(button(wrapper).attributes('aria-busy')).toBe('true')
    await button(wrapper).trigger('click')
    expect(api.getBlob).toHaveBeenCalledTimes(1)

    release(file)
    await settle()
    expect(button(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('con un resultado vacío no se puede exportar', async () => {
    total = 0
    const wrapper = await mount('/plants?q=zzzz')

    expect(button(wrapper).attributes('disabled')).toBeDefined()
    await button(wrapper).trigger('click')
    expect(api.getBlob).not.toHaveBeenCalled()
  })

  it('un 422 por exceso de filas se muestra en línea con el mensaje del servidor, sin descargar', async () => {
    total = 1200
    api.getBlob.mockRejectedValue(new ApiError(422, '1200 filas superan el máximo de 1000: afina los filtros'))
    const wrapper = await mount('/plants?status=cuarentena')

    await button(wrapper).trigger('click')
    await settle()

    expect(wrapper.find('[data-test="export-error"]').text()).toContain('1200 filas superan el máximo de 1000: afina los filtros')
    expect(downloadBlob).not.toHaveBeenCalled()
    // La pantalla no se pierde: la tabla y los filtros siguen donde estaban.
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('CAT-GRUSS-01')
    expect(useRouter().currentRoute.value.query.status).toBe('cuarentena')
  })

  it('un fallo cualquiera del API también se muestra en línea', async () => {
    api.getBlob.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación. Inténtalo de nuevo.'))
    const wrapper = await mount()

    await button(wrapper).trigger('click')
    await settle()

    expect(wrapper.find('[data-test="export-error"]').exists()).toBe(true)
  })

  it('cambiar un filtro retira el error anterior: ya no se refiere a lo que se ve', async () => {
    api.getBlob.mockRejectedValueOnce(new ApiError(422, 'demasiadas filas'))
    const wrapper = await mount()
    await button(wrapper).trigger('click')
    await settle()
    expect(wrapper.find('[data-test="export-error"]').exists()).toBe(true)

    await wrapper.find('[data-test="filter-search"]').setValue('gruss')
    await new Promise((resolve) => setTimeout(resolve, 400))
    await settle()

    expect(wrapper.find('[data-test="export-error"]').exists()).toBe(false)
  })
})
