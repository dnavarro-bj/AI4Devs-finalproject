import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { downloadBlob } from '@shared/utils/downloadBlob'
import { useToast } from '@shared/composables/useToast'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesIndex from '../app/pages/species/index.vue'

vi.mock('@shared/utils/downloadBlob', () => ({ downloadBlob: vi.fn() }))

enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

/** Requirement «Exportar el resultado filtrado desde el inventario y el catálogo», lado catálogo. */
describe('catálogo de especies: exportar el resultado filtrado', () => {
  const SPECIES = { id: '1', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }
  const file = { blob: new Blob(['a']), filename: 'cactify-especies-2026-10-07.csv' }

  const pageOf = (content: unknown[], totalElements = content.length) =>
    ({ content, totalElements, totalPages: 1, pageNumber: 0, pageSize: 25 })

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
    api.get.mockImplementation(async () => pageOf(total ? [SPECIES] : [], total))
  })

  const mount = async (route = '/species') => {
    const wrapper = await mountSuspended(SpeciesIndex, { route })
    await settle()
    return wrapper
  }
  type Wrapper = Awaited<ReturnType<typeof mount>>
  const button = (wrapper: Wrapper) => wrapper.find('[data-test="export"]')

  it('declara su alcance antes de ejecutar: el recuento de la tabla', async () => {
    total = 74
    const wrapper = await mount()

    expect(button(wrapper).text()).toContain('Exportar 74 resultados')
  })

  it('con una sola especie, en singular', async () => {
    const wrapper = await mount()

    expect(button(wrapper).text()).toContain('Exportar 1 resultado')
    expect(button(wrapper).text()).not.toContain('resultados')
  })

  it('descarga el CSV con los criterios de la URL —un grupo es una consulta— y lo confirma', async () => {
    total = 12
    const wrapper = await mount('/species?minTemperatureFrom=9&sort=scientificName,asc')

    await button(wrapper).trigger('click')
    await settle()

    expect(api.getBlob).toHaveBeenCalledWith('/species/export?minTemperatureFrom=9&sort=scientificName,asc')
    expect(downloadBlob).toHaveBeenCalledWith(file.blob, 'cactify-especies-2026-10-07.csv')
    expect(useToast().toasts.value.map((toast) => toast.message)).toEqual([
      'Exportación lista: cactify-especies-2026-10-07.csv',
    ])
  })

  it('los meses de crecimiento viajan repetidos y en forma canónica', async () => {
    const wrapper = await mount('/species?growthMonth=12&growthMonth=1&growthMonth=2')

    await button(wrapper).trigger('click')
    await settle()

    expect(api.getBlob).toHaveBeenCalledWith('/species/export?growthMonth=1&growthMonth=12&growthMonth=2')
  })

  it('una sola petición: un segundo clic mientras exporta no pide otra', async () => {
    let release!: (value: typeof file) => void
    api.getBlob.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const wrapper = await mount()

    await button(wrapper).trigger('click')
    await button(wrapper).trigger('click')

    expect(api.getBlob).toHaveBeenCalledTimes(1)
    release(file)
    await settle()
  })

  it('con un resultado vacío no se puede exportar', async () => {
    total = 0
    const wrapper = await mount('/species?q=zzzz')

    expect(button(wrapper).attributes('disabled')).toBeDefined()
  })

  it('un 422 se muestra en línea con el mensaje del servidor y la pantalla sigue como estaba', async () => {
    total = 6000
    api.getBlob.mockRejectedValue(new ApiError(422, '6000 filas superan el máximo de 5000: afina los filtros'))
    const wrapper = await mount('/species?exposure=semisombra')

    await button(wrapper).trigger('click')
    await settle()

    expect(wrapper.find('[data-test="export-error"]').text()).toContain('6000 filas superan el máximo de 5000: afina los filtros')
    expect(downloadBlob).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(true)
    expect(useRouter().currentRoute.value.query.exposure).toBe('semisombra')
  })
})
