import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SoilMixesIndex from '../app/pages/soil-mixes/index.vue'
import type { SoilMix } from '@features/soil-mixes/types/soilMix.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** Escenarios "Catálogo con mezclas" y "Catálogo vacío" de la requirement «Catálogo de mezclas». */
describe('catálogo de sustratos', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const mix = (id: string, name: string, organic = 20): SoilMix => ({
    id,
    name,
    organicPercentage: organic,
    mineralPercentage: 100 - organic,
    phMin: 5.5,
    phMax: 6.5,
    description: 'akadama, pómez, turba',
  })

  const page = (content: SoilMix[]): PageResponse<SoilMix> => ({
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    pageNumber: 0,
    pageSize: 25,
  })

  it('lista las mezclas con su composición y su rango de pH', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral de drenaje rápido')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Sustrato mineral de drenaje rápido')
    expect(text).toContain('20')
    expect(text).toContain('80')
    expect(text).toContain('5.5')
    expect(text).toContain('6.5')
  })

  it('cada mezcla navega a su ficha', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral de drenaje rápido')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('[data-test="soil-mix-link"]').attributes('href')).toBe('/soil-mixes/100001')
  })

  it('presenta el catálogo con el nombre de producto Sustratos', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('h1').text()).toContain('Sustratos')
    expect(wrapper.text()).toContain('Añadir sustrato')
  })

  it('el catálogo vacío lo explica y ofrece registrar la primera, sin tabla en blanco', async () => {
    api.get.mockResolvedValue(page([]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="soil-mixes-table"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('primera')
  })

  it('ofrece registrar una mezcla desde la cabecera', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('[data-test="new-soil-mix"]').attributes('href')).toBe('/soil-mixes/new')
  })

  /** Ordenar es del API: la tabla solo tiene delante una página (ADR-009). */
  it('ordenar vuelve a pedir el catálogo al API, no reordena la página visible', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral'), mix('100002', 'Sustrato orgánico')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()
    api.get.mockClear()

    await wrapper.find('th[aria-sort] button').trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/soil-mixes', expect.objectContaining({ sort: expect.stringContaining('name') }))
  })

  it('ofrece una ordenación visible por composición además de la cabecera', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()
    api.get.mockClear()

    await wrapper.find('[data-test="sort-soil-mixes"]').setValue('mineralPercentage,desc')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/soil-mixes', {
      page: 0,
      sort: 'mineralPercentage,desc',
    })
  })

  /** Escenarios «La composición se ve, no solo se lee» y «El pH se interpreta». */
  it('la composición se ve como proporción, con sus dos cifras legibles', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral de drenaje rápido', 20)]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const cell = wrapper.find('[data-test="composition"]')
    expect(cell.find('.proportion').exists(), 'la composición no se ve como proporción').toBe(true)
    expect(cell.text()).toContain('20')
    expect(cell.text()).toContain('80')
  })

  it('la barra de la celda es la compacta, no la de una ficha', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral', 20)]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('[data-test="composition"] .proportion').classes()).toContain('is-compact')
  })

  it('la identidad de cada sustrato incluye el gráfico circular de su composición', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral', 20)]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const wheel = wrapper.find('[data-test="composition-wheel"]')
    expect(wheel.classes()).toContain('is-compact')
    expect(wheel.attributes('aria-label')).toContain('Mineral 80%')
  })

  it('el pH se acompaña de su lectura cualitativa, no solo del número', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const cell = wrapper.find('[data-test="ph"]')
    expect(cell.text()).toContain('5.5')
    expect(cell.text()).toContain('6.5')
    expect(cell.text()).toContain('Ligeramente ácido')
  })

  it('la receta acompaña al nombre de la mezcla, como en el prototipo', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral de drenaje rápido')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const cell = wrapper.find('[data-test="soil-mix-link"]')
    expect(cell.text()).toContain('Sustrato mineral de drenaje rápido')
    expect(cell.text()).toContain('akadama, pómez, turba')
  })

  /** El API no cuenta las especies por fila —sería un N+1—, así que la columna va marcada. */
  it('el uso por especies se muestra marcado, porque el listado no lo sirve', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const cell = wrapper.find('[data-test="usage"]')
    expect(cell.attributes('data-mock')).toBe('true')
    expect(cell.text()).toContain('API pendiente')
  })

  it('reserva una columna para el número de plantas que usan cada sustrato', async () => {
    api.get.mockResolvedValue(page([mix('100001', 'Sustrato mineral')]))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    const cell = wrapper.find('[data-test="plants-count"]')
    expect(cell.attributes('data-mock')).toBe('true')
    expect(cell.text()).toContain('plantas')
    expect(cell.text()).toContain('API pendiente')
  })

  it('un fallo al cargar se muestra, y no deja la pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="soil-mixes-table"]').exists()).toBe(false)
  })
})
