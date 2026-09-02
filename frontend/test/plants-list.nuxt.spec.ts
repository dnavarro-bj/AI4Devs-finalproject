import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'
import type { PageResponse, PlantSummary } from '../app/types/api'

const api = createApiDouble()
mockNuxtImport('useApi', () => () => api)

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
