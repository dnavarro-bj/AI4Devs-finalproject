import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesIndex from '../app/pages/species/index.vue'
import type { SpeciesSummary } from '@features/species/types/species.types'
import type { PageResponse } from '@shared/types/api.types'

/** La URL es estado compartido entre tests: cada uno desmonta lo suyo. */
enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

/** Escenarios de la requirement «Catálogo de especies». */
describe('catálogo de especies', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const species = (id: string, scientificName: string, commonName: string, code = 'CAT-GRUSS'): SpeciesSummary =>
    ({ id, code, scientificName, commonName })

  const page = (content: SpeciesSummary[]): PageResponse<SpeciesSummary> => ({
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    pageNumber: 0,
    pageSize: 25,
  })

  it('muestra una fila por especie con sus dos nombres', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Echinocactus grusonii')
    expect(text).toContain('Asiento de suegra')
    expect(text).toContain('Mammillaria elongata')
  })

  /** Escenarios de la miniatura (T-19): la portada real, o un marcador que lo dice. */
  describe('miniatura de cada especie', () => {
    it('una especie con portada muestra su miniatura real con su texto alternativo', async () => {
      api.get.mockResolvedValue(page([{
        ...species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
        photoCount: 3,
        primaryPhoto: {
          id: '9', altText: 'Echinocactus grusonii adulto',
          urls: { thumb: '/media/9/thumb', medium: '/media/9/medium', full: '/media/9/full' },
        },
      }]))

      const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
      await settle()

      const thumb = wrapper.find('[data-test="species-thumb"]')
      expect(thumb.attributes('src')).toContain('/media/9/thumb')
      expect(thumb.attributes('src')).toMatch(/^https?:\/\//)
      expect(thumb.attributes('alt')).toBe('Echinocactus grusonii adulto')
    })

    it('sin portada pinta el marcador, que lo dice con su texto alternativo', async () => {
      api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

      const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
      await settle()

      const mark = wrapper.find('[data-test="species-thumb-empty"]')
      expect(mark.attributes('aria-label')).toBe('Sin fotografía de Echinocactus grusonii')
      expect(wrapper.find('[data-test="species-thumb"]').exists()).toBe(false)
    })

    it('la vista de fotografías sigue marcada y deshabilitada: este change no la construye', async () => {
      api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

      const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
      await settle()

      const view = wrapper.find('[aria-label="Vista de fotografías"]')
      expect(view.attributes('disabled')).toBeDefined()
      expect(view.attributes('data-mock')).toBe('true')
    })
  })

  it('cada especie navega a su ficha', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    expect(wrapper.find('[data-test="species-link"]').attributes('href')).toBe('/species/200001')
  })

  it('el catálogo vacío lo explica y ofrece registrar la primera, sin tabla en blanco', async () => {
    api.get.mockResolvedValue(page([]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('primera')
  })

  it('ofrece registrar una especie desde la cabecera', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    expect(wrapper.find('[data-test="new-species"]').attributes('href')).toBe('/species/new')
  })

  /** Ordenar es del API: la tabla solo tiene delante una página (ADR-009). */
  it('ordenar vuelve a pedir el catálogo al API, no reordena la página visible', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()
    api.get.mockClear()

    await wrapper.find('th[aria-sort] button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/species', expect.objectContaining({ sort: expect.stringContaining('scientificName') }))
  })

  /** Escenario «Código de la especie en el catálogo y en su ficha»: el código es el del API. */
  it('cada fila muestra el código real de la especie, sin marca de maqueta', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra', 'CAT-GRUSS'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama', 'CAT-MAMMI'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    const codes = wrapper.findAll('[data-test="species-code"]')
    expect(codes.map((code) => code.text())).toEqual(['CAT-GRUSS', 'CAT-MAMMI'])
    expect(codes.every((code) => code.attributes('data-mock') === undefined)).toBe(true)
  })

  /**
   * El API no sirve cuántos ejemplares hay de cada especie **en el listado** (sería una consulta por
   * fila): lo alimentará T-21. Aparece porque el wireframe lo pide, pero **marcado**.
   */
  it('el recuento de ejemplares se muestra marcado como maqueta, con su ticket', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    const cell = wrapper.find('[data-test="specimens-count"]')
    expect(cell.attributes('data-mock')).toBe('true')
    expect(cell.text()).toContain('T-21')
    expect(cell.find('strong').exists(), 'falta el peso visual del recuento').toBe(true)
  })

  /** Escenario «La especie se reconoce por cualquiera de sus nombres». */
  it('el nombre científico y el común van juntos en la misma celda', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    const cell = wrapper.find('[data-test="species-link"]')
    expect(cell.text()).toContain('Echinocactus grusonii')
    expect(cell.text()).toContain('Asiento de suegra')
  })

  /**
   * Escenario «Lo que el listado no trae se distingue de lo que no existe».
   *
   * Temperatura, riego y sustrato **sí existen** —están en `GET /species/{id}`—, pero el listado
   * devuelve solo los nombres. Marcarlas sin más las haría parecer inventadas.
   */
  it('las columnas que el listado no trae dicen dónde está el dato de verdad', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    for (const test of ['temperature', 'watering', 'soil-mix'] as const) {
      const cell = wrapper.find(`[data-test="col-${test}"]`)
      expect(cell.exists(), `falta la columna ${test}`).toBe(true)
      expect(cell.attributes('data-mock'), `${test} no está marcada`).toBe('true')
      expect(cell.text(), `${test} no dice dónde está el dato`).toContain('ficha')
    }
  })

  it('lo que de verdad no existe se marca con su ticket, no con «en la ficha»', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    // La exposición no está en ningún endpoint: llega con T-17.
    const exposure = wrapper.find('[data-test="col-exposure"]')
    expect(exposure.attributes('data-mock')).toBe('true')
    expect(exposure.text()).toContain('T-17')
    expect(exposure.findAll('i')).toHaveLength(4)
  })

  it('dice cuántas especies se están mostrando', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    expect(wrapper.find('[data-test="result-count"]').text()).toContain('2')
  })

  it('un fallo al cargar se muestra, y no deja la pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(false)
  })
})

/**
 * Escenarios de «El catálogo de especies filtra y ordena como el prototipo»
 * (`filtros-y-orden-del-inventario`): búsqueda, exposición, temperatura y crecimiento, criterios
 * retirables, orden por columna y estado en la URL. Lo que no existe sigue marcado.
 */
describe('catálogo de especies: filtros y orden', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({
      content: [
        { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
        { id: '200002', code: 'CAT-MAMMI', scientificName: 'Mammillaria elongata', commonName: 'Dedo de dama' },
      ],
      totalElements: 74,
      totalPages: 3,
      pageNumber: 0,
      pageSize: 25,
    })
  })

  const pause = () => new Promise((resolve) => setTimeout(resolve, 400))
  const lastCall = () => api.get.mock.calls.at(-1)![1] as Record<string, unknown>
  const currentQuery = () => useRouter().currentRoute.value.query

  it('buscar por nombre o código envía q tras una pausa y aparece como criterio', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    const box = wrapper.find('[data-test="filter-search"]')
    expect(box.attributes('disabled')).toBeUndefined()
    expect(box.attributes('placeholder')).toBe('Nombre científico, común o código')
    for (const text of ['s', 'su', 'sue']) await box.setValue(text)
    await pause()

    expect(lastCall()).toMatchObject({ q: 'sue', page: 0 })
    expect(api.get.mock.calls.filter(([, params]) => (params as Record<string, unknown>).q).length).toBe(1)
    expect(wrapper.find('.filter-chip').text()).toContain('Búsqueda: sue')
  })

  it('filtrar por exposición lo pide al API y dice cuántas se muestran de cuántas', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    await wrapper.find('[data-test="filter-exposure"]').setValue('semisombra')
    await settle()

    expect(lastCall()).toMatchObject({ exposure: ['semisombra'] })
    expect(wrapper.find('.filter-chip').text()).toContain('Exposición: Semisombra')
    expect(wrapper.find('[data-test="result-count"]').text()).toContain('Mostrando 2 de 74 especies')
  })

  it('«sensibles al frío» pide la temperatura mínima por extremos', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    await wrapper.find('[data-test="filter-temperature"]').setValue('cold-sensitive')
    await settle()

    expect(lastCall()).toMatchObject({ minTemperatureFrom: 9 })
    expect(lastCall()).not.toHaveProperty('minTemperatureTo')
    expect(wrapper.find('.filter-chip').text()).toContain('Temperatura: Sensibles al frío')
  })

  it('un intervalo de temperatura pide los dos extremos', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    await wrapper.find('[data-test="filter-temperature"]').setValue('moderate')
    await settle()

    expect(lastCall()).toMatchObject({ minTemperatureFrom: 5, minTemperatureTo: 8 })
  })

  it('el crecimiento pide los meses del atajo, repetidos', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    await wrapper.find('[data-test="filter-growth"]').setValue('winter')
    await settle()

    expect(lastCall()).toMatchObject({ growthMonth: [12, 1, 2] })
    expect(wrapper.find('.filter-chip').text()).toContain('Crecimiento: invierno')
  })

  it('cada criterio se retira por separado y «Limpiar filtros» los quita todos', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()
    await wrapper.find('[data-test="filter-exposure"]').setValue('semisombra')
    await wrapper.find('[data-test="filter-growth"]').setValue('winter')
    await settle()

    await wrapper.findAll('.filter-chip').find((chip) => chip.text().includes('Exposición'))!.find('button').trigger('click')
    await settle()
    expect(lastCall()).not.toHaveProperty('exposure')
    expect(lastCall()).toMatchObject({ growthMonth: [12, 1, 2] })

    await wrapper.find('[data-test="clear-filters"]').trigger('click')
    await settle()
    expect(lastCall()).toEqual({ page: 0 })
  })

  it('ordenar por el nombre científico pide la clave pública', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    await wrapper.find('th[aria-sort] button').trigger('click')
    await settle()
    expect(lastCall()).toMatchObject({ sort: 'scientificName,asc' })

    await wrapper.find('th[aria-sort] button').trigger('click')
    await settle()
    expect(lastCall()).toMatchObject({ sort: 'scientificName,desc' })
  })

  it('ninguna especie coincide: lo explica y ofrece limpiar, sin confundirlo con un catálogo vacío', async () => {
    api.get.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 })
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species?exposure=sombra' })
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="no-match"]').exists()).toBe(true)

    await wrapper.find('[data-test="clear-all"]').trigger('click')
    await settle()
    expect(lastCall()).toEqual({ page: 0 })
  })

  it('el riego figura como no disponible: es texto libre', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, { route: '/species' })
    await settle()

    const watering = wrapper.find('[data-test="filter-watering"]')
    expect(watering.attributes('disabled')).toBeDefined()
    expect(watering.attributes('aria-label')).toContain('texto libre')
  })

  it('el estado vive en la URL: un enlace llega filtrado y ordenado, y cambiar un criterio la escribe', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, {
      route: '/species?exposure=pleno_sol&minTemperatureFrom=9&growthMonth=12&growthMonth=1&growthMonth=2&sort=scientificName,desc',
    })
    await settle()

    expect(api.get).toHaveBeenCalledWith('/species', {
      page: 0, sort: 'scientificName,desc', exposure: ['pleno_sol'], minTemperatureFrom: 9, growthMonth: [12, 1, 2],
    })
    const chips = wrapper.findAll('.filter-chip').map((chip) => chip.text())
    expect(chips).toHaveLength(3)

    await wrapper.find('[data-test="filter-exposure"]').setValue('sombra')
    await settle()
    await vi.waitFor(() => expect(currentQuery()).toMatchObject({ exposure: 'sombra', minTemperatureFrom: '9' }))
  })

  it('un parámetro inválido o desconocido de la URL se ignora, sin error', async () => {
    const wrapper = await mountSuspended(SpeciesIndex, {
      route: '/species?exposure=playa&minTemperatureFrom=frio&growthMonth=13&sort=password,asc&colour=red',
    })
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(api.get).toHaveBeenCalledWith('/species', { page: 0 })
  })
})
