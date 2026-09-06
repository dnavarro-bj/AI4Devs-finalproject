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
describe('catálogo de mezclas de sustrato', () => {
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

  it('un fallo al cargar se muestra, y no deja la pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(SoilMixesIndex)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="soil-mixes-table"]').exists()).toBe(false)
  })
})
