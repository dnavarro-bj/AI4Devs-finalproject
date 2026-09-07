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

  /**
   * El escenario «Ficha de una mezcla». Comprueba el requisito —la composición se ve **y** se
   * lee— y no un marcado concreto: al recomponer la ficha sobre el prototipo, la proporción pasó
   * de una barra con leyenda a una rueda más una barra rotulada por dentro, y el requisito no
   * cambió.
   */
  it('muestra la composición en proporción y en cifras', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    // Se ve como figura…
    expect(wrapper.find('[data-test="composition-wheel"]').exists()).toBe(true)
    // …y se lee como cifra: una figura sin número obliga a estimar a ojo un dato exacto.
    expect(wrapper.text()).toContain('20')
    expect(wrapper.text()).toContain('80')
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

  /** Escenarios «Composición como figura» y «El pH sobre su escala». */
  it('abre con la composición como figura, que es la identidad de la receta', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    const wheel = wrapper.find('[data-test="composition-wheel"]')
    expect(wheel.exists(), 'la ficha no abre con la rueda de composición').toBe(true)
    // Sigue leyéndose como cifra, no solo como sector.
    expect(wheel.text()).toContain('80')
    expect(wheel.text()).toContain('20')
  })

  it('la receta de referencia rotula las partes dentro de la barra', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    const recipe = wrapper.find('[data-test="recipe-bar"] .proportion')
    expect(recipe.classes()).toContain('has-labels-inside')
    expect(recipe.text()).toContain('Orgánico')
  })

  it('sitúa el pH sobre una escala con sus extremos nombrados', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    const scale = wrapper.find('[data-test="ph-scale"]')
    expect(scale.exists(), 'el pH no está sobre una escala').toBe(true)
    expect(scale.text()).toContain('Ácido')
    expect(scale.text()).toContain('Alcalino')
  })

  it('acompaña el pH de su lectura cualitativa', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="ph-quality"]').text()).toContain('Ligeramente ácido')
  })

  /**
   * El prototipo muestra unos datos muy convincentes que el API no sirve. Cada uno declara su
   * ticket: una ficha con «Drenaje: muy alto» inventado es indistinguible de una que lo calcula.
   */
  it('cada sección que el API no alimenta dice qué ticket la llena', async () => {
    api.get.mockResolvedValue(detail())

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    for (const test of ['components', 'properties', 'species-usage', 'preparation'] as const) {
      const section = wrapper.find(`[data-test="${test}"]`)
      expect(section.exists(), `falta la sección ${test}`).toBe(true)
      expect(section.attributes('data-mock'), `${test} no está marcada`).toBe('true')
      expect(section.text(), `${test} no dice su ticket`).toMatch(/T-\d+/)
    }
  })

  it('una mezcla inexistente se dice, con salida al catálogo y sin pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La mezcla de tierra '100001' no existe"))

    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('/soil-mixes')
  })
})
