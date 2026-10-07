import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesIndex from '../app/pages/species/index.vue'
import type { SavedView } from '../src/features/views/types/view.types'

enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

/**
 * Requirement «Grupos de cultivo en el catálogo de especies»: la fila de grupos del prototipo son
 * las vistas guardadas del catálogo, con su recuento; el seleccionado es el que coincide con la URL.
 */
describe('catálogo de especies: grupos de cultivo', () => {
  const species = (id: string, scientificName: string) => ({ id, code: `CAT-${id}`, scientificName, commonName: 'x' })
  const SPECIES = [species('1', 'Echinocactus grusonii'), species('2', 'Mammillaria elongata')]

  const group = (id: string, name: string, query: string, matchCount: number): SavedView => ({
    id, scope: 'species', name, query, matchCount, createdAt: '', updatedAt: '',
  })

  const GROUPS = [
    group('10', 'Cactus de semisombra', 'exposure=semisombra', 3),
    group('11', 'Sensibles al frío', 'minTemperatureFrom=9', 12),
    group('12', 'Pleno sol', 'exposure=pleno_sol', 1),
  ]

  const pageOf = (content: unknown[], totalElements = content.length) =>
    ({ content, totalElements, totalPages: 1, pageNumber: 0, pageSize: 25 })

  const speciesCalls = () => api.get.mock.calls.filter(([path]) => path === '/species')
  const lastSpeciesCall = () => speciesCalls().at(-1)![1] as Record<string, unknown>
  const currentQuery = () => useRouter().currentRoute.value.query

  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    api.savedViews.mockReset()
    api.savedViews.mockResolvedValue(pageOf(GROUPS))
    api.get.mockImplementation(async (_path: string, params?: Record<string, unknown>) =>
      pageOf(params?.size === 1 ? SPECIES.slice(0, 1) : SPECIES, params?.size === 1 ? 74 : 2))
  })

  const mount = async (route = '/species') => {
    const wrapper = await mountSuspended(SpeciesIndex, { route })
    await settle()
    return wrapper
  }

  const buttons = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findAll('[data-test="groups"] button')
  const names = (wrapper: Awaited<ReturnType<typeof mount>>) => buttons(wrapper).map((button) => button.find('strong').text())
  const selected = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    buttons(wrapper).filter((button) => button.attributes('aria-pressed') === 'true').map((button) => button.find('strong').text())

  it('pinta «Todas» y un grupo por vista guardada, con su recuento', async () => {
    const wrapper = await mount()

    expect(names(wrapper)).toEqual(['Todas', 'Cactus de semisombra', 'Pleno sol', 'Sensibles al frío'])
    expect(api.savedViews).toHaveBeenCalledWith('/saved-views', { scope: 'species', page: 0, size: 500 })
    const text = wrapper.find('[data-test="groups"]').text()
    expect(text).toContain('12 especies')
    expect(text).toContain('1 especie')
  })

  it('«Todas» lleva el total real del catálogo y es la seleccionada sin criterios', async () => {
    const wrapper = await mount()

    expect(buttons(wrapper)[0]!.text()).toContain('2 especies')
    expect(selected(wrapper)).toEqual(['Todas'])
  })

  it('«Todas» no cambia con un filtro: sigue diciendo el total sin filtrar', async () => {
    api.get.mockImplementation(async (_path: string, params?: Record<string, unknown>) =>
      params?.size === 1 ? pageOf(SPECIES.slice(0, 1), 74) : pageOf(SPECIES.slice(0, 1), 5))
    const wrapper = await mount('/species?q=grus')

    expect(buttons(wrapper)[0]!.text()).toContain('74 especies')
    expect(selected(wrapper)).toEqual([])
  })

  it('el símbolo se deriva de la regla: sol, media luna o neutro', async () => {
    const wrapper = await mount()

    const symbols = Object.fromEntries(buttons(wrapper).map((button) => [button.find('strong').text(), button.find('[aria-hidden]').text()]))
    expect(symbols).toMatchObject({ 'Pleno sol': '☼', 'Cactus de semisombra': '◐', 'Sensibles al frío': '◇', Todas: '⌘' })
  })

  it('elegir un grupo escribe su consulta en la URL, pide el catálogo con ella y lo deja seleccionado', async () => {
    const wrapper = await mount()

    await buttons(wrapper).find((button) => button.text().includes('Sensibles al frío'))!.trigger('click')
    await settle()

    await vi.waitFor(() => expect(currentQuery()).toMatchObject({ minTemperatureFrom: '9' }))
    expect(lastSpeciesCall()).toMatchObject({ minTemperatureFrom: 9 })
    expect(selected(wrapper)).toEqual(['Sensibles al frío'])
  })

  it('un enlace con la consulta de un grupo llega con ese grupo seleccionado, aunque los parámetros vengan en otro orden', async () => {
    api.savedViews.mockResolvedValue(pageOf([group('20', 'Invernal', 'exposure=semisombra&minTemperatureFrom=9', 4)]))
    const wrapper = await mount('/species?minTemperatureFrom=9&exposure=semisombra')

    expect(selected(wrapper)).toEqual(['Invernal'])
  })

  it('cambiar un filtro sale del grupo y ofrece reemplazarlo con el nuevo estado', async () => {
    const wrapper = await mount()
    await buttons(wrapper).find((button) => button.text().includes('Cactus de semisombra'))!.trigger('click')
    await settle()
    expect(selected(wrapper)).toEqual(['Cactus de semisombra'])

    await wrapper.find('[data-test="filter-temperature"]').setValue('cold-sensitive')
    await settle()

    expect(selected(wrapper)).toEqual([])
    await wrapper.find('[data-test="views-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="views-modified"]').text()).toContain('Cactus de semisombra')
  })

  it('«Todas» limpia los criterios', async () => {
    const wrapper = await mount('/species?exposure=pleno_sol&minTemperatureFrom=9')

    await buttons(wrapper)[0]!.trigger('click')
    await settle()

    await vi.waitFor(() => expect(currentQuery()).toEqual({}))
    expect(selected(wrapper)).toEqual(['Todas'])
  })

  it('ordenar no saca de «Todas»: el orden no es un criterio', async () => {
    const wrapper = await mount('/species?sort=scientificName,desc')

    expect(selected(wrapper)).toEqual(['Todas'])
  })

  it('guarda los filtros actuales como grupo y lo deja seleccionado', async () => {
    api.post.mockImplementation(async (_path: string, body: Record<string, unknown>) =>
      group('30', body.name as string, body.query as string, 2))
    const wrapper = await mount('/species?exposure=semisombra&minTemperatureFrom=9')

    await wrapper.find('[data-test="views-toggle"]').trigger('click')
    await wrapper.find('[data-test="view-save"]').trigger('click')
    await wrapper.find('[data-test="view-name"]').setValue('Frágiles de sombra')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/saved-views', {
      scope: 'species', name: 'Frágiles de sombra', query: 'exposure=semisombra&minTemperatureFrom=9',
    })
    expect(names(wrapper)).toContain('Frágiles de sombra')
    expect(selected(wrapper)).toEqual(['Frágiles de sombra'])
  })

  it('un nombre repetido se queda en el diálogo con su error', async () => {
    api.post.mockRejectedValue(new ApiError(409, 'Ya existe una vista con ese nombre'))
    const wrapper = await mount('/species?exposure=sombra')

    await wrapper.find('[data-test="views-toggle"]').trigger('click')
    await wrapper.find('[data-test="view-save"]').trigger('click')
    await wrapper.find('[data-test="view-name"]').setValue('Pleno sol')
    await wrapper.find('[data-test="name-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="name-error"]').text()).toContain('Ya existe una vista con ese nombre')
    expect((wrapper.find('[data-test="view-name"]').element as HTMLInputElement).value).toBe('Pleno sol')
  })

  it('borrar un grupo lo quita de la fila y no toca la tabla', async () => {
    api.delete.mockResolvedValue(undefined)
    const wrapper = await mount()

    await wrapper.find('[data-test="views-toggle"]').trigger('click')
    await wrapper.find('[data-test="view-11"] [data-test="view-remove"]').trigger('click')
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/saved-views/11')
    expect(names(wrapper)).not.toContain('Sensibles al frío')
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(true)
  })

  it('sin grupos solo queda «Todas» y una invitación; no se simulan grupos', async () => {
    api.savedViews.mockResolvedValue(pageOf([]))
    const wrapper = await mount()

    expect(names(wrapper)).toEqual(['Todas'])
    expect(wrapper.find('[data-test="groups-empty"]').text()).toContain('guarda los filtros como grupo')
  })

  it('un grupo cuya mezcla se retiró se muestra con recuento 0 y no rompe la pantalla', async () => {
    api.savedViews.mockResolvedValue(pageOf([group('40', 'Mezcla vieja', 'soilMix=999', 0)]))
    const wrapper = await mount()

    expect(wrapper.find('[data-test="groups"]').text()).toContain('0 especies')
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
  })

  it('si los grupos no cargan, lo dice en línea y el catálogo sigue funcionando', async () => {
    api.savedViews.mockRejectedValue(new ApiError(500, 'Caído'))
    const wrapper = await mount()

    expect(wrapper.find('[data-test="groups-error"]').text()).toContain('Caído')
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(true)
    expect(names(wrapper)).toEqual(['Todas'])
  })
})
