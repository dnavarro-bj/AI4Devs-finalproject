import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SoilMixDetail from '../app/pages/soil-mixes/[id]/index.vue'
import type { SoilMixDetail as Detail } from '@features/soil-mixes/types/soilMix.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

mockNuxtImport('useRoute', () => () => ({ params: { id: '100001' } }))

/** Escenarios de la requirement «Ficha de una mezcla». */
describe('ficha de una mezcla de sustrato', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const detail = (overrides: Partial<Detail> = {}): Detail => ({
    id: '100001',
    name: 'Sustrato mineral de drenaje rápido',
    organicPercentage: 20,
    mineralPercentage: 80,
    phMin: 5.5,
    phMax: 6.5,
    description: 'akadama, pómez, turba',
    speciesCount: 3,
    ...overrides,
  })

  it('muestra la composición en proporción y en cifras', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    // La proporción se ve como barra…
    expect(wrapper.findAll('[data-role="part"]')).toHaveLength(2)
    // …y se lee como cifra: una barra sin número obliga a estimar a ojo un dato exacto.
    expect(wrapper.text()).toContain('20%')
    expect(wrapper.text()).toContain('80%')
  })

  it('muestra el rango de pH y la receta', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.text()).toContain('5.5')
    expect(wrapper.text()).toContain('6.5')
    expect(wrapper.text()).toContain('akadama, pómez, turba')
  })

  /** Es la cifra que decide si se puede retirar y a cuántas especies alcanza corregirla. */
  it('dice cuántas especies la recomiendan', async () => {
    api.get.mockResolvedValue(detail({ speciesCount: 3 }))

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="species-count"]').text()).toContain('3')
  })

  it('una mezcla que nadie recomienda lo dice, y no oculta la cifra', async () => {
    api.get.mockResolvedValue(detail({ speciesCount: 0 }))

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="species-count"]').text()).toContain('0')
  })

  it('una mezcla sin receta no finge tenerla', async () => {
    api.get.mockResolvedValue(detail({ description: null }))

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="recipe"]').text()).toContain('—')
  })

  it('ofrece corregir la mezcla desde su ficha', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="edit-soil-mix"]').attributes('href')).toBe('/soil-mixes/100001/edit')
  })

  it('una mezcla inexistente se dice, con salida al catálogo y sin pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La mezcla de tierra '100001' no existe"))

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('/soil-mixes')
  })
})
