import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesIndex from '../app/pages/species/index.vue'
import type { SpeciesSummary } from '@features/species/types/species.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** Escenarios de la requirement «Catálogo de especies». */
describe('catálogo de especies', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const species = (id: string, scientificName: string, commonName: string): SpeciesSummary =>
    ({ id, scientificName, commonName })

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

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Echinocactus grusonii')
    expect(text).toContain('Asiento de suegra')
    expect(text).toContain('Mammillaria elongata')
  })

  it('cada especie navega a su ficha', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    expect(wrapper.find('[data-test="species-link"]').attributes('href')).toBe('/species/200001')
  })

  it('el catálogo vacío lo explica y ofrece registrar la primera, sin tabla en blanco', async () => {
    api.get.mockResolvedValue(page([]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('primera')
  })

  it('ofrece registrar una especie desde la cabecera', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    expect(wrapper.find('[data-test="new-species"]').attributes('href')).toBe('/species/new')
  })

  /** Ordenar es del API: la tabla solo tiene delante una página (ADR-009). */
  it('ordenar vuelve a pedir el catálogo al API, no reordena la página visible', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()
    api.get.mockClear()

    await wrapper.find('th[aria-sort] button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/species', expect.objectContaining({ sort: expect.stringContaining('scientificName') }))
  })

  /**
   * El API no sirve cuántos ejemplares hay de cada especie (T-15). Aparece porque el wireframe lo
   * pide, pero **marcado**: una columna de maqueta indistinguible de un dato es peor que no tenerla.
   */
  it('el recuento de ejemplares se muestra marcado como maqueta, con su ticket', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    const cell = wrapper.find('[data-test="specimens-count"]')
    expect(cell.attributes('data-mock')).toBe('true')
    expect(cell.text()).toContain('T-15')
  })

  /** Escenario «La especie se reconoce por cualquiera de sus nombres». */
  it('el nombre científico y el común van juntos en la misma celda', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex)
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

    const wrapper = await mountSuspended(SpeciesIndex)
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

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    // La exposición no está en ningún endpoint: llega con T-17.
    const exposure = wrapper.find('[data-test="col-exposure"]')
    expect(exposure.attributes('data-mock')).toBe('true')
    expect(exposure.text()).toContain('T-17')
  })

  /**
   * «Todas» no es un grupo pendiente: es el estado actual del listado, y su recuento sale del API.
   * Marcarlo sería mentir en la otra dirección, como con el género en la ficha.
   */
  it('el grupo «Todas» lleva el recuento real y no va marcado', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    const all = wrapper.find('[data-test="group-all"]')
    expect(all.text()).toContain('2')
    expect(all.attributes('data-mock')).toBeUndefined()
  })

  it('los grupos de cultivo aparecen marcados, porque no existen todavía', async () => {
    api.get.mockResolvedValue(page([species('200001', 'Echinocactus grusonii', 'Asiento de suegra')]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    const groups = wrapper.find('[data-test="groups"]')
    expect(groups.attributes('data-mock')).toBe('true')
    expect(groups.text()).toContain('T-21')
  })

  it('dice cuántas especies se están mostrando', async () => {
    api.get.mockResolvedValue(page([
      species('200001', 'Echinocactus grusonii', 'Asiento de suegra'),
      species('200002', 'Mammillaria elongata', 'Cactus dedo de dama'),
    ]))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    expect(wrapper.find('[data-test="result-count"]').text()).toContain('2')
  })

  it('un fallo al cargar se muestra, y no deja la pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(SpeciesIndex)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="species-table"]').exists()).toBe(false)
  })
})
