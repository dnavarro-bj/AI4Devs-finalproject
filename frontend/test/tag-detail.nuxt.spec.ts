import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import TagDetail from '../app/pages/tags/[id]/index.vue'
import type { TagDetail as TagDetailModel, TagListItem } from '@features/catalogs/types/catalog.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '400001' } }))

/** `mockNuxtImport` se iza, así que el doble tiene que existir antes: de ahí `vi.hoisted`. */
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('navigateTo', () => navigate)

/**
 * Escenarios de «Ficha de una etiqueta» y «Administración de una etiqueta», que especifican la
 * composición de la pantalla `tag-detail` del prototipo.
 */
describe('ficha de una etiqueta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    navigate.mockReset()
  })

  const tag = (plantCount: number): TagDetailModel => ({
    id: '400001',
    name: 'Globular',
    normalizedName: 'globular',
    plantCount,
  })

  const plant = (id: string, nickname: string): PlantSummary => ({
    id,
    nickname,
    createdAt: null,
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const others: TagListItem[] = [
    { id: '400002', name: 'Semillero propio', plantCount: 12 },
    { id: '400001', name: 'Globular', plantCount: 3 },
  ]

  /** La ficha pide: la etiqueta, sus plantas con el filtro de T-02, el inventario y el catálogo. */
  function respond(plantCount: number, plants: PlantSummary[] = [], totalPlants = 100) {
    api.get.mockImplementation((path: string, query?: Record<string, unknown>) => {
      if (path === '/tags/400001') return Promise.resolve(tag(plantCount))
      if (path === '/tags') {
        return Promise.resolve({ content: others, totalElements: 2, totalPages: 1, pageNumber: 0, pageSize: 25 })
      }
      if (query && 'tag' in query) {
        return Promise.resolve({
          content: plants,
          totalElements: plants.length,
          totalPages: 1,
          pageNumber: 0,
          pageSize: 25,
        } satisfies PageResponse<PlantSummary>)
      }
      return Promise.resolve({ content: [], totalElements: totalPlants, totalPages: 1, pageNumber: 0, pageSize: 1 })
    })
  }

  it('la ficha abre con la marca, el estado y el nombre normalizado', async () => {
    respond(3, [plant('500001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    const hero = wrapper.find('[data-test="tag-hero"]')
    expect(hero.exists(), 'falta la portada de la etiqueta').toBe(true)
    expect(hero.text()).toContain('Globular')
    expect(hero.find('[data-test="normalized-name"]').text()).toContain('globular')
  })

  /** La distribución del prototipo: cifras destacadas, no una lista de campos. */
  it('la distribución en la colección abre la pantalla como cifras destacadas', async () => {
    respond(20, [plant('500001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    const distribution = wrapper.find('[data-test="distribution"]')
    expect(distribution.exists(), 'falta la distribución en la colección').toBe(true)
    expect(distribution.find('[data-test="plant-count"]').text()).toContain('20')
    expect(distribution.text()).toContain('%')

    for (const test of ['metric-species', 'metric-locations']) {
      const tile = distribution.find(`[data-test="${test}"]`)
      expect(tile.exists(), `falta la métrica ${test} del prototipo`).toBe(true)
      expect(tile.attributes('data-mock'), `${test} no está marcada`).toBe('true')
    }
  })

  it('lista las plantas con el filtro por etiqueta que ya existe', async () => {
    respond(2, [plant('500001', 'Asiento de suegra'), plant('500002', 'Bola blanca')])

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ tag: ['400001'] }))
    expect(wrapper.find('[data-test="plant-link"]').attributes('href')).toBe('/plants/500001')
    expect(wrapper.find('[data-test="filtered-inventory"]').attributes('href')).toBe('/plants?tag=400001')
  })

  it('una etiqueta sin plantas lo dice y ofrece retirarla', async () => {
    respond(0)

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    expect(wrapper.find('[data-test="no-plants"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="remove-tag"]').exists()).toBe(true)
  })

  it('el reparto por localizaciones, la descripción y las fechas quedan marcados', async () => {
    respond(3, [plant('500001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    for (const [test, ticket] of [
      ['location-breakdown', 'T-21'],
      ['description', 'T-17'],
      ['dates', 'T-20'],
    ] as const) {
      const block = wrapper.find(`[data-test="${test}"]`)
      expect(block.exists(), `falta el hueco declarado de ${test}`).toBe(true)
      expect(block.attributes('data-mock'), `${test} no está marcado`).toBe('true')
      expect(block.text()).toContain(ticket)
    }
  })

  it('una etiqueta inexistente lo explica y ofrece volver al catálogo', async () => {
    api.get.mockRejectedValue(new ApiError(404, "El tag '400001' no existe"))

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('renombra desde la ficha, conservando las plantas que la tienen', async () => {
    respond(3, [plant('500001', 'Asiento de suegra')])
    api.put.mockResolvedValue({ id: '400001', name: 'Globulares' })

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="rename-tag"]').trigger('click')
    await wrapper.find('[data-test="rename-name"]').setValue('Globulares')
    await wrapper.find('[data-test="rename-submit"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/tags/400001', { name: 'Globulares' })
    expect(wrapper.text()).toContain('Globulares')
    expect(wrapper.find('[data-test="plant-count"]').text()).toContain('3')
  })

  /** El nombre ya usado se señala junto al campo, no como fallo genérico. */
  it('un nombre ya usado se explica junto al formulario', async () => {
    respond(3)
    api.put.mockRejectedValue(new ApiError(409, "Ya existe un tag con el nombre 'Semillero propio'"))

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="rename-tag"]').trigger('click')
    await wrapper.find('[data-test="rename-name"]').setValue('Semillero propio')
    await wrapper.find('[data-test="rename-submit"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="rename-error"]').text()).toContain('Ya existe')
    expect(wrapper.text()).toContain('Globular')
  })

  /** El alcance se declara con la cifra exacta **antes** de confirmar: §13.3 del producto. */
  it('la combinación declara cuántas plantas se verán afectadas antes de confirmar', async () => {
    respond(87, [plant('500001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="merge-tag"]').trigger('click')

    const dialog = wrapper.find('[data-test="merge-dialog"]')
    expect(dialog.text()).toContain('87')
    expect(dialog.text().toLowerCase()).toContain('desaparec')
  })

  it('combina la etiqueta en otra y confirma el alcance de lo ocurrido', async () => {
    respond(87, [plant('500001', 'Asiento de suegra')])
    api.post.mockResolvedValue({ target: { id: '400002', name: 'Semillero propio' }, affectedPlants: 87 })

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="merge-tag"]').trigger('click')
    await wrapper.find('[data-test="merge-target"]').setValue('400002')
    await wrapper.find('[data-test="merge-submit"]').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/tags/400001/merge', { targetId: '400002' })
    expect(navigate).toHaveBeenCalledWith('/tags/400002')
  })

  it('la combinación cancelada no toca nada', async () => {
    respond(87)

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="merge-tag"]').trigger('click')
    await wrapper.find('[data-test="cancel-merge"]').trigger('click')
    await settle()

    expect(api.post).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="merge-dialog"]').exists()).toBe(false)
  })

  it('retira una etiqueta sin uso y vuelve al catálogo', async () => {
    respond(0)
    api.delete.mockResolvedValue(undefined)

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="remove-tag"]').trigger('click')
    await wrapper.find('[data-test="confirm-removal"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/tags/400001')
    expect(navigate).toHaveBeenCalledWith('/tags')
  })

  /** Retirar una etiqueta en uso no deja sin salida: ofrece combinarla. */
  it('la retirada en uso ofrece combinar en lugar de dejar sin salida', async () => {
    respond(87, [plant('500001', 'Asiento de suegra')])

    const wrapper = await mountSuspended(TagDetail)
    await settle()

    await wrapper.find('[data-test="remove-tag"]').trigger('click')

    const dialog = wrapper.find('[data-test="remove-dialog"]')
    expect(dialog.text()).toContain('87')
    expect(wrapper.find('[data-test="merge-instead"]').exists(), 'no ofrece combinarla').toBe(true)
    expect(wrapper.find('[data-test="confirm-removal"]').exists()).toBe(false)
  })
})
