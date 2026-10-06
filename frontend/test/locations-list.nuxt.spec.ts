import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import LocationsIndex from '../app/pages/locations/index.vue'
import type { LocationListItem } from '@features/catalogs/types/catalog.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Catálogo de localizaciones», que especifica **la composición** de
 * la pantalla `locations` del prototipo: mapa del vivero y vista general, no una tabla de filas.
 */
describe('catálogo de localizaciones', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const page = (content: LocationListItem[]): PageResponse<LocationListItem> => ({
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    pageNumber: 0,
    pageSize: 25,
  })

  const someLocations = () => page([
    { id: '300001', name: 'Invernadero 1', plantCount: 12 },
    { id: '300002', name: 'Bandeja A3', plantCount: 4 },
    { id: '300003', name: 'Estantería vacía', plantCount: 0 },
  ])

  /** La pantalla pide el catálogo y el inventario: el total de la colección es real, no una suma. */
  function respond(locations = someLocations(), totalPlants = 16) {
    api.get.mockImplementation((path: string) => {
      if (path === '/locations') return Promise.resolve(locations)
      return Promise.resolve({ content: [], totalElements: totalPlants, totalPages: 1, pageNumber: 0, pageSize: 1 })
    })
  }

  it('el catálogo es un mapa del vivero, no una lista de filas', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="nursery-map"]').exists(), 'falta el mapa del vivero').toBe(true)
    expect(wrapper.find('[data-test="nursery-map"] [role="tree"]').exists(), 'el mapa no es un árbol').toBe(true)
  })

  it('la vista general presenta una tarjeta por localización', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    const cards = wrapper.findAll('[data-test="zone-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.text()).toContain('Invernadero 1')
  })

  it('cada localización dice la carga que soporta, y la tarjeta también como proporción', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="nursery-map"]').text()).toContain('12')

    const card = wrapper.findAll('[data-test="zone-card"]')[0]!
    expect(card.text()).toContain('12')
    expect(card.find('.progress').exists(), 'la carga no se ve como proporción').toBe(true)
  })

  it('el total de la colección encabeza el mapa', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    const root = wrapper.find('[data-test="collection-total"]')
    expect(root.text()).toContain('16')
    expect(root.text()).toContain('3')
  })

  it('una localización vacía aparece igualmente, señalada como vacía', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    const card = wrapper.findAll('[data-test="zone-card"]')[2]!
    expect(card.text()).toContain('Estantería vacía')
    expect(card.text().toLowerCase()).toContain('vacía')
  })

  it('cada localización navega a su ficha', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="zone-card"]').attributes('href')).toBe('/locations/300001')
  })

  it('ofrece salida al inventario completo, como el prototipo', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="all-plants"]').attributes('href')).toBe('/plants')
  })

  it('mantiene el mapa a la izquierda y la vista general como contenido principal', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    const overview = wrapper.find('.overview')
    expect(overview.element.firstElementChild?.getAttribute('data-test')).toBe('nursery-map')
    expect(overview.find('.overview-main').exists()).toBe(true)
    expect(overview.find('.metric-strip').exists()).toBe(true)
  })

  /** Los niveles que faltan se declaran **dentro del mapa**, no sustituyendo el mapa. */
  it('los niveles de la jerarquía quedan marcados dentro del propio mapa', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    const pending = wrapper.find('[data-test="nursery-map"] [data-test="hierarchy-pending"]')
    expect(pending.exists()).toBe(true)
    expect(pending.attributes('data-mock')).toBe('true')
    expect(pending.text()).toContain('T-18')
  })

  it('el bloque de atención del prototipo queda declarado con su ticket', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    const attention = wrapper.find('[data-test="attention"]')
    expect(attention.attributes('data-mock')).toBe('true')
    expect(attention.text()).toContain('T-23')
  })

  it('el catálogo vacío lo explica y ofrece crear la primera, sin un mapa en blanco', async () => {
    respond(page([]), 0)

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nursery-map"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('primera')
  })

  it('un fallo al cargar se muestra, y no deja el mapa a medias', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nursery-map"]').exists()).toBe(false)
  })

  /** El wireframe abre el editor completo, no comprime el alta en un diálogo. */
  it('abre el editor de alta en su propia pantalla', async () => {
    respond()

    const wrapper = await mountSuspended(LocationsIndex)
    await settle()

    expect(wrapper.find('[data-test="new-location"]').attributes('href')).toBe('/locations/new')
    expect(wrapper.find('[data-test="new-location-dialog"]').exists()).toBe(false)
  })
})
