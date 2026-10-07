import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { nursery, page, summary } from './helpers/locationFixtures'
import LocationsIndex from '../app/pages/locations/index.vue'
import type { LocationSummary } from '@features/locations/types/location.types'

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

  function respond(rows: LocationSummary[] = nursery()) {
    api.get.mockImplementation(async () => page(rows))
  }

  async function open() {
    const wrapper = await mountSuspended(LocationsIndex)
    await settle()
    return wrapper
  }

  it('el catálogo es un mapa del vivero, no una lista de filas', async () => {
    respond()
    const wrapper = await open()

    expect(wrapper.find('[data-test="nursery-map"]').exists(), 'falta el mapa del vivero').toBe(true)
    expect(wrapper.find('[data-test="nursery-map"] [role="tree"]').exists(), 'el mapa no es un árbol').toBe(true)
  })

  it('el árbol tiene todos sus niveles y cada nodo dice sus ejemplares totales', async () => {
    respond()
    const wrapper = await open()

    const map = wrapper.find('[data-test="nursery-map"]')
    expect(map.text()).toContain('Invernadero 1')
    expect(map.text()).toContain('Bancada norte')
    expect(map.text()).toContain('Bandeja A3')
    expect(map.find('[data-test="count-300001"]').text(), 'el invernadero cuenta lo que cuelga de él').toBe('62')
    expect(map.find('[data-test="count-300003"]').text()).toBe('31')
    // Tres niveles de anidación real: raíz de la colección > invernadero > bancada > bandeja.
    expect(map.findAll('[role="group"]').length).toBeGreaterThanOrEqual(3)
  })

  it('los nodos con hijas se pliegan y se despliegan', async () => {
    respond()
    const wrapper = await open()

    await wrapper.find('[data-test="toggle-300001"]').trigger('click')

    expect(wrapper.find('[data-test="nursery-map"]').text()).not.toContain('Bancada norte')
  })

  it('el total de la colección encabeza el mapa', async () => {
    respond()
    const wrapper = await open()

    const total = wrapper.find('[data-test="collection-total"]')
    expect(total.text(), 'las raíces suman la colección entera').toContain('64')
    expect(total.text()).toContain('5')
  })

  it('la vista general presenta una tarjeta por zona de primer nivel', async () => {
    respond()
    const wrapper = await open()

    const cards = wrapper.findAll('[data-test="zone-card"]')
    expect(cards.map((card) => card.text())).toEqual([
      expect.stringContaining('Cuarentena'),
      expect.stringContaining('Invernadero 1'),
    ])
  })

  it('la tarjeta con capacidad expresa la carga como proporción ocupada', async () => {
    respond()
    const wrapper = await open()

    const card = wrapper.findAll('[data-test="zone-card"]').find((candidate) => candidate.text().includes('Invernadero 1'))!
    expect(card.text()).toContain('62')
    expect(card.find('.progress').exists(), 'la carga no se ve como proporción').toBe(true)
    expect(card.text()).toContain('16 %')
  })

  it('una tarjeta sin capacidad no inventa una proporción: dice que no está definida', async () => {
    respond()
    const wrapper = await open()

    const card = wrapper.findAll('[data-test="zone-card"]').find((candidate) => candidate.text().includes('Cuarentena'))!
    expect(card.find('.progress').exists()).toBe(false)
    expect(card.text()).toContain('Sin capacidad definida')
  })

  it('una localización vacía aparece igualmente, señalada como vacía', async () => {
    respond([...nursery(), summary({ id: '300009', name: 'Estantería vacía' })])
    const wrapper = await open()

    const card = wrapper.findAll('[data-test="zone-card"]').find((candidate) => candidate.text().includes('Estantería vacía'))!
    expect(card.text().toLowerCase()).toContain('vacía')
  })

  it('cada tarjeta navega a su ficha', async () => {
    respond()
    const wrapper = await open()

    const card = wrapper.findAll('[data-test="zone-card"]').find((candidate) => candidate.text().includes('Invernadero 1'))!
    expect(card.attributes('href')).toBe('/locations/300001')
  })

  describe('seleccionar en el mapa', () => {
    it('lleva la vista general a esa zona: sus sublocalizaciones y su ficha', async () => {
      respond()
      const wrapper = await open()

      await wrapper.find('[data-test="select-300002"]').trigger('click')

      const cards = wrapper.findAll('[data-test="zone-card"]')
      expect(cards.map((card) => card.text())).toEqual([
        expect.stringContaining('Bandeja A3'),
        expect.stringContaining('Bandeja A4'),
      ])
      expect(wrapper.find('[data-test="overview-title"]').text()).toBe('Bancada norte')
      expect(wrapper.find('[data-test="open-location"]').attributes('href')).toBe('/locations/300002')
    })

    it('«Toda la colección» vuelve a las zonas de primer nivel', async () => {
      respond()
      const wrapper = await open()

      await wrapper.find('[data-test="select-300002"]').trigger('click')
      await wrapper.find('[data-test="select-all"]').trigger('click')

      expect(wrapper.find('[data-test="overview-title"]').text()).toBe('Toda la colección')
      expect(wrapper.findAll('[data-test="zone-card"]')).toHaveLength(2)
    })

    it('una hoja lo dice en lugar de dejar la vista vacía', async () => {
      respond()
      const wrapper = await open()

      await wrapper.find('[data-test="select-300003"]').trigger('click')

      expect(wrapper.find('[data-test="no-children"]').exists()).toBe(true)
    })
  })

  describe('buscar en el mapa', () => {
    it('deja las coincidencias con la ruta que lleva hasta ellas', async () => {
      respond()
      const wrapper = await open()

      await wrapper.find('[data-test="map-search"]').setValue('A3')

      const map = wrapper.find('[data-test="nursery-map"]')
      expect(map.text()).toContain('Bandeja A3')
      expect(map.text()).toContain('Bancada norte')
      expect(map.text()).not.toContain('Bandeja A4')
      expect(map.text()).not.toContain('Cuarentena')
    })

    it('sin coincidencias lo dice', async () => {
      respond()
      const wrapper = await open()

      await wrapper.find('[data-test="map-search"]').setValue('zzz')

      expect(wrapper.find('[data-test="map-no-match"]').exists()).toBe(true)
    })
  })

  it('ofrece salida al inventario completo, como el prototipo', async () => {
    respond()
    const wrapper = await open()

    expect(wrapper.find('[data-test="all-plants"]').attributes('href')).toBe('/plants')
  })

  it('mantiene el mapa a la izquierda y la vista general como contenido principal', async () => {
    respond()
    const wrapper = await open()

    const overview = wrapper.find('.overview')
    expect(overview.element.firstElementChild?.getAttribute('data-test')).toBe('nursery-map')
    expect(overview.find('.overview-main').exists()).toBe(true)
    expect(overview.find('.metric-strip').exists()).toBe(true)
  })

  it('la jerarquía es real: ningún nivel del mapa queda marcado con T-18', async () => {
    respond()
    const wrapper = await open()

    expect(wrapper.find('[data-test="hierarchy-pending"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="capacity-pending"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('T-18')
  })

  it('el bloque de atención del prototipo queda declarado con su ticket', async () => {
    respond()
    const wrapper = await open()

    const attention = wrapper.find('[data-test="attention"]')
    expect(attention.attributes('data-mock')).toBe('true')
    expect(attention.text()).toContain('T-23')
  })

  it('recorre todas las páginas del catálogo para montar el mapa entero', async () => {
    const rows = nursery()
    api.get.mockImplementation(async (_path: string, params: { page: number }) => (params.page === 0
      ? page(rows.slice(0, 3), { totalPages: 2, totalElements: 5 })
      : page(rows.slice(3), { totalPages: 2, totalElements: 5, pageNumber: 1 })))
    const wrapper = await open()

    expect(wrapper.find('[data-test="nursery-map"]').text()).toContain('Bandeja A4')
    expect(wrapper.find('[data-test="nursery-map"]').text()).toContain('Cuarentena')
  })

  it('el catálogo vacío lo explica y ofrece crear la primera, sin un mapa en blanco', async () => {
    respond([])
    const wrapper = await open()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nursery-map"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('primera')
  })

  it('un fallo al cargar se muestra, y no deja el mapa a medias', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))
    const wrapper = await open()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="nursery-map"]').exists()).toBe(false)
  })

  /** El wireframe abre el editor completo, no comprime el alta en un diálogo. */
  it('abre el editor de alta en su propia pantalla', async () => {
    respond()
    const wrapper = await open()

    expect(wrapper.find('[data-test="new-location"]').attributes('href')).toBe('/locations/new')
    expect(wrapper.find('[data-test="new-location-dialog"]').exists()).toBe(false)
  })
})
