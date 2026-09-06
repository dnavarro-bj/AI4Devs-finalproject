import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios "Inventario con plantas", "Inventario vacío", "Inventario con más plantas de las que
 * caben en una página" y "Navegación al detalle".
 */
describe('listado del inventario', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const page = (content: PlantSummary[], overrides: Partial<PageResponse<PlantSummary>> = {}): PageResponse<PlantSummary> => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    pageNumber: 0,
    pageSize: 25,
    ...overrides,
  })

  it('muestra una fila por planta con nickname, especie y localización', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Bola verde'), plant('2', 'Pinchitos')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Bola verde')
    expect(text).toContain('Pinchitos')
    expect(text).toContain('Echinocactus grusonii')
    expect(text).toContain('Invernadero 1')
  })

  it('avisa de que el inventario está vacío en lugar de pintar una tabla en blanco', async () => {
    api.get.mockResolvedValue(page([]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(wrapper.text().toLowerCase()).toContain('no hay ninguna planta')
    expect(wrapper.find('[data-test="plants-table"]').exists()).toBe(false)
  })

  it('ofrece avanzar y retroceder cuando hay más de una página', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Bola verde')], { totalElements: 30, totalPages: 2 }))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const next = wrapper.find('[data-test="next-page"]')
    const previous = wrapper.find('[data-test="previous-page"]')
    expect(next.exists()).toBe(true)
    expect(previous.attributes('disabled')).toBeDefined()

    await next.trigger('click')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', { page: 1 })
  })

  it('enlaza al detalle de cada planta', async () => {
    api.get.mockResolvedValue(page([plant('882687672222443468', 'Bola verde')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const link = wrapper.find('[data-test="plant-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/plants/882687672222443468')
  })
})

/**
 * Escenarios "Ordenar el inventario" y "Criterios de filtrado aplicados" de la requirement
 * "Listado del inventario" (`plant-dashboard`), añadidos por `esqueleto-plantas`.
 */
describe('inventario a escala', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const page = (content: PlantSummary[]) => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    pageNumber: 0,
    pageSize: 25,
  })

  it('ordenar vuelve a pedir al API con ese criterio, y no reordena solo la página visible', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta'), plant('2', 'Alfa')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    api.get.mockClear()
    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ sort: 'nickname,asc' }))
  })

  it('invertir el sentido vuelve a pedirlo', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()
    api.get.mockClear()
    await wrapper.findAll('th button')[0]!.trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ sort: 'nickname,desc' }))
  })

  it('muestra los criterios de filtrado aplicados y permite retirarlos', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    // Sin filtros no se ofrece limpiar.
    expect(wrapper.find('[data-test="clear-filters"]').exists()).toBe(false)

    await wrapper.find('[data-test="filter-tag"]').setValue('globular')
    await settle()

    expect(wrapper.find('.filter-chip').text()).toContain('globular')
    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ tag: ['globular'] }))
  })

  it('retirar un criterio lo vuelve a pedir sin él', async () => {
    api.get.mockResolvedValue(page([plant('1', 'Zeta')]))
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-tag"]').setValue('globular')
    await settle()
    api.get.mockClear()
    await wrapper.find('.filter-chip button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.not.objectContaining({ tag: expect.anything() }))
  })
})

/**
 * Las columnas y los filtros del wireframe. Los que el API no soporta existen en la pantalla pero
 * van deshabilitados y marcados: sirven para ver la forma, no para hacer creer que filtran.
 */
describe('inventario: columnas y filtros del wireframe', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    nickname,
    createdAt: '2026-09-01T10:00:00Z',
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  function serve(content: PlantSummary[]) {
    api.get.mockImplementation(async (path: string) => (path === '/locations'
      ? { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      : { content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 }))
  }

  it('muestra las seis columnas de la pantalla', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    // Las ordenables llevan su indicador de sentido; aquí interesa el nombre de la columna.
    const headers = wrapper.findAll('thead th')
      .map((th) => th.text().replace(/[↕↑↓]/g, '').trim())
      .filter(Boolean)
    expect(headers).toEqual([
      'Planta', 'Especie', 'Localización', 'Último riego', 'Atención', 'Acciones',
    ])
  })

  it('marca como maqueta las columnas que el API no sirve', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    // Último riego, atención y acciones: se ven, pero no se confunden con un dato.
    expect(wrapper.findAll('tbody [data-mock="true"]').length).toBeGreaterThanOrEqual(3)
  })

  it('permite seleccionar filas y ofrece las acciones masivas', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(wrapper.find('[data-role="bulk-actions"]').exists()).toBe(false)

    await wrapper.find('tbody input[type="checkbox"]').setValue(true)

    const bar = wrapper.find('[data-role="bulk-actions"]')
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toContain('1')
  })

  it('el filtro de localización sí filtra: el API lo admite desde T-02', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="filter-location"]').setValue('300001')
    await settle()

    expect(api.get).toHaveBeenLastCalledWith('/plants', expect.objectContaining({ location: '300001' }))
    expect(wrapper.find('.filter-chip').text()).toContain('Invernadero 1')
  })

  it('los filtros que el API no admite están deshabilitados, no rotos', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    for (const test of ['filter-search', 'filter-species', 'filter-status']) {
      const field = wrapper.find(`[data-test="${test}"]`)
      expect(field.exists()).toBe(true)
      expect(field.attributes('disabled')).toBeDefined()
    }
  })

  it('las columnas se pueden ocultar, salvo la identificativa', async () => {
    serve([plant('1', 'Bola verde')])
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    await wrapper.find('[data-test="configure-columns"]').trigger('click')
    const picker = wrapper.find('[data-test="columns-picker"]')
    expect(picker.text()).not.toContain('Planta')
    expect(picker.text()).toContain('Especie')
  })
})
