import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import LocationDetail from '../app/pages/locations/[id]/index.vue'
import type { LocationDetail as LocationDetailModel } from '@features/catalogs/types/catalog.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300001' } }))

/** Escenarios de la requirement «Ficha de una localización». */
describe('ficha de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const location = (plantCount: number): LocationDetailModel => ({
    id: '300001',
    name: 'Invernadero 1',
    plantCount,
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    nickname,
    createdAt: '2026-05-04T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const plantsPage = (content: PlantSummary[]): PageResponse<PlantSummary> => ({
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    pageNumber: 0,
    pageSize: 25,
  })

  /** La ficha pide dos cosas: la localización y las plantas que alberga, con el filtro de T-02. */
  function respond(plantCount: number, plants: PlantSummary[]) {
    api.get.mockImplementation((path: string) => {
      if (path === '/locations/300001') return Promise.resolve(location(plantCount))
      return Promise.resolve(plantsPage(plants))
    })
  }

  it('muestra la localización con el número de ejemplares que alberga', async () => {
    respond(2, [plant('400001', 'Asiento de suegra'), plant('400002', 'Bola blanca')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(wrapper.text()).toContain('Invernadero 1')
    expect(wrapper.find('[data-test="plant-count"]').text()).toContain('2')
  })

  it('lista los ejemplares con el filtro por localización que ya existe', async () => {
    respond(2, [plant('400001', 'Asiento de suegra'), plant('400002', 'Bola blanca')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ location: '300001' }))
    expect(wrapper.text()).toContain('Asiento de suegra')
  })

  it('cada ejemplar navega a su ficha', async () => {
    respond(1, [plant('400001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(wrapper.find('[data-test="plant-link"]').attributes('href')).toBe('/plants/400001')
  })

  /** El resto de la página está en el inventario, que es donde viven orden y columnas. */
  it('ofrece ver el inventario filtrado por esta localización', async () => {
    respond(30, [plant('400001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(wrapper.find('[data-test="filtered-inventory"]').attributes('href')).toBe('/plants?location=300001')
  })

  it('una localización vacía lo dice y ofrece retirarla', async () => {
    respond(0, [])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(wrapper.find('[data-test="no-plants"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="remove-location"]').exists()).toBe(true)
  })

  /** La portada del prototipo: marca del espacio, identidad y ruta, no solo un título. */
  it('la ficha abre con la marca del espacio y su identidad', async () => {
    respond(2, [plant('400001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    const hero = wrapper.find('[data-test="location-hero"]')
    expect(hero.exists(), 'falta la portada del espacio').toBe(true)
    expect(hero.text()).toContain('Invernadero 1')
    expect(hero.find('[data-test="space-code"]').attributes('data-mock'), 'el código del espacio es T-15 y va marcado').toBe('true')
    expect(hero.find('[data-test="location-path"]').attributes('data-mock'), 'la ruta es T-18 y va marcada').toBe('true')
  })

  /** La fila de métricas del prototipo: cifras destacadas, no una lista de campos. */
  it('las métricas del espacio abren la pantalla como cifras destacadas', async () => {
    respond(31, [plant('400001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    const metrics = wrapper.find('[data-test="location-metrics"]')
    expect(metrics.exists(), 'falta la fila de métricas').toBe(true)
    expect(metrics.find('[data-test="plant-count"]').text()).toContain('31')

    for (const test of ['metric-children', 'metric-tasks', 'metric-alerts']) {
      const tile = metrics.find(`[data-test="${test}"]`)
      expect(tile.exists(), `falta la métrica ${test} del prototipo`).toBe(true)
      expect(tile.attributes('data-mock'), `${test} no está marcada`).toBe('true')
    }
  })

  /** Lo que el prototipo enseña y el API no sirve se declara con su ticket, no se simula. */
  it('la jerarquía, las características, los movimientos y las tareas quedan declarados', async () => {
    respond(1, [plant('400001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    for (const [test, ticket] of [
      ['children', 'T-18'],
      ['facts', 'T-18'],
      ['movements', 'T-18'],
      ['tasks', 'T-22'],
    ] as const) {
      const block = wrapper.find(`[data-test="${test}"]`)
      expect(block.exists(), `falta el hueco declarado de ${test}`).toBe(true)
      expect(block.attributes('data-mock'), `${test} no está marcado como maqueta`).toBe('true')
      expect(block.text()).toContain(ticket)
    }
  })

  it('una localización inexistente lo explica y ofrece volver al catálogo', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La localización '300001' no existe"))

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('un fallo al cargar se muestra, y no deja la ficha en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })
})
