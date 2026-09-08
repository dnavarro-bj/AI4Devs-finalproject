import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import TagsIndex from '../app/pages/tags/index.vue'
import type { TagListItem } from '@features/catalogs/types/catalog.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Catálogo de etiquetas», que especifica **la composición** de la
 * pantalla `tags` del prototipo: salud del catálogo y el uso como proporción, no una lista de
 * nombres con un número al lado.
 */
describe('catálogo de etiquetas', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const page = (content: TagListItem[]): PageResponse<TagListItem> => ({
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    pageNumber: 0,
    pageSize: 25,
  })

  const someTags = () => page([
    { id: '400001', name: 'Semillero propio', plantCount: 60 },
    { id: '400002', name: 'Globular', plantCount: 20 },
    { id: '400003', name: 'Sin uso', plantCount: 0 },
  ])

  /** La pantalla pide el catálogo y el inventario: el porcentaje es real, no una suma de la página. */
  function respond(tags = someTags(), totalPlants = 100) {
    api.get.mockImplementation((path: string) => {
      if (path === '/tags') return Promise.resolve(tags)
      return Promise.resolve({ content: [], totalElements: totalPlants, totalPages: 1, pageNumber: 0, pageSize: 1 })
    })
  }

  it('lista las etiquetas con cuántas plantas tiene cada una', async () => {
    respond()

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Semillero propio')
    expect(text).toContain('60')
  })

  it('el uso se ve como proporción sobre el inventario, no solo como número', async () => {
    respond()

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    const cell = wrapper.find('[data-test="usage"]')
    expect(cell.find('.progress').exists(), 'el uso no se ve como proporción').toBe(true)
    expect(cell.text()).toContain('60')
    expect(cell.text()).toContain('%')
  })

  /** La etiqueta sin uso es justo la que se puede retirar: se muestra, señalada. */
  it('una etiqueta sin plantas aparece igualmente, señalada como sin uso', async () => {
    respond()

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    const rows = wrapper.findAll('[data-test="tag-link"]')
    expect(rows).toHaveLength(3)
    expect(wrapper.text()).toContain('Sin uso')
  })

  it('cada etiqueta navega a su ficha', async () => {
    respond()

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    expect(wrapper.find('[data-test="tag-link"]').attributes('href')).toBe('/tags/400001')
  })

  /** El bloque «salud del catálogo» del prototipo, con el dato que sí es real. */
  it('la salud del catálogo encabeza la pantalla', async () => {
    respond()

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    const health = wrapper.find('[data-test="catalog-health"]')
    expect(health.exists(), 'falta el bloque de salud del catálogo').toBe(true)
    expect(health.text()).toContain('100')
  })

  it('los ejemplos, las fechas y los duplicados quedan marcados con su ticket', async () => {
    respond()

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    for (const [test, ticket] of [
      ['col-examples', 'T-15'],
      ['col-updated', 'T-20'],
      ['duplicates', 'T-21'],
      ['bulk', 'T-24'],
    ] as const) {
      const block = wrapper.find(`[data-test="${test}"]`)
      expect(block.exists(), `falta el hueco declarado de ${test}`).toBe(true)
      expect(block.attributes('data-mock'), `${test} no está marcado`).toBe('true')
      expect(block.text()).toContain(ticket)
    }
  })

  it('el catálogo vacío lo explica y ofrece crear la primera', async () => {
    respond(page([]), 0)

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tags-table"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('primera')
  })

  it('un fallo al cargar se muestra, y no deja el listado a medias', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tags-table"]').exists()).toBe(false)
  })

  it('crea una etiqueta desde el catálogo y vuelve a pedir el listado', async () => {
    respond()
    api.post.mockResolvedValue({ id: '400004', name: 'Injertado' })

    const wrapper = await mountSuspended(TagsIndex)
    await settle()
    api.get.mockClear()

    await wrapper.find('[data-test="new-tag"]').trigger('click')
    await wrapper.find('[data-test="new-tag-name"]').setValue('Injertado')
    await wrapper.find('[data-test="new-tag-submit"]').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/tags', { name: 'Injertado' })
    expect(api.get).toHaveBeenCalledWith('/tags', expect.anything())
  })

  /** El nombre duplicado es el error propio de este catálogo: se explica junto al campo. */
  it('un nombre ya usado se explica sin cerrar el diálogo', async () => {
    respond()
    api.post.mockRejectedValue(new ApiError(409, "Ya existe un tag con el nombre 'Globular'"))

    const wrapper = await mountSuspended(TagsIndex)
    await settle()

    await wrapper.find('[data-test="new-tag"]').trigger('click')
    await wrapper.find('[data-test="new-tag-name"]').setValue('Globular')
    await wrapper.find('[data-test="new-tag-submit"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="new-tag-error"]').text()).toContain('Ya existe')
    expect(wrapper.find('[data-test="new-tag-name"]').exists()).toBe(true)
  })
})
