import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesDetail from '../app/pages/species/[id]/index.vue'
import type { SpeciesCare } from '@features/species/types/species.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '200001' } }))

/** Escenarios de la requirement «Ficha de una especie». */
describe('ficha de una especie', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const care = (overrides: Partial<SpeciesCare> = {}): SpeciesCare => ({
    id: '200001',
    scientificName: 'Echinocactus grusonii',
    commonName: 'Asiento de suegra',
    minHumidity: 10,
    maxHumidity: 30,
    minTemperature: 10,
    maxTemperature: 35,
    minLightHours: 6,
    maxLightHours: 10,
    wateringGuideline: 'cada 10-20 dias en crecimiento',
    soilMix: { id: '100001', name: 'Sustrato mineral de drenaje rápido' },
    ...overrides,
  })

  it('muestra los dos nombres de la especie', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.text()).toContain('Echinocactus grusonii')
    expect(wrapper.text()).toContain('Asiento de suegra')
  })

  it('muestra la pauta que heredan sus ejemplares: los tres rangos y el riego', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const conditions = wrapper.find('[data-test="conditions"]').text()
    expect(conditions).toContain('10')
    expect(conditions).toContain('30')
    expect(conditions).toContain('35')
    expect(conditions).toContain('cada 10-20 dias en crecimiento')
  })

  /** Dejó de ser maqueta con `catalogo-sustratos`: la ficha la sirve el API. */
  it('muestra la mezcla de sustrato, que es dato real y navega a su ficha', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const link = wrapper.find('[data-test="soil-mix-link"]')
    expect(link.text()).toContain('Sustrato mineral de drenaje rápido')
    expect(link.attributes('href')).toBe('/soil-mixes/100001')
    expect(link.attributes('data-mock')).toBeUndefined()
  })

  it('ofrece corregir y retirar la especie desde su ficha', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="edit-species"]').attributes('href')).toBe('/species/200001/edit')
    expect(wrapper.find('[data-test="remove-species"]').exists()).toBe(true)
  })

  /**
   * La ficha del wireframe es mucho más ancha que lo que el API sirve. Lo que falta se declara con
   * su ticket: una sección inventada y sin marcar es indistinguible de una que funciona.
   */
  it('cada sección que el API no sirve dice qué ticket la llena', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    for (const [test, ticket] of [
      ['year-cycle', 'T-17'],
      ['flowering', 'T-17'],
      ['photos', 'T-19'],
      ['specimens', 'T-15'],
      ['groups', 'T-21'],
    ] as const) {
      const section = wrapper.find(`[data-test="${test}"]`)
      expect(section.exists(), `falta la sección ${test}`).toBe(true)
      expect(section.attributes('data-mock'), `${test} no está marcada`).toBe('true')
      expect(section.text(), `${test} no dice su ticket`).toContain(ticket)
    }
  })

  /** Escenario «La pauta se lee de una vez»: es lo que se consulta de una especie. */
  it('presenta la pauta como una sola lectura, con sus cinco magnitudes reales', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const text = wrapper.findAll('[data-test="conditions"] [data-role="condition"]')
      .map((row) => row.text()).join(' | ')

    expect(text).toMatch(/Temperatura.*Humedad.*Luz.*Riego.*Sustrato/s)
  })

  it('cada magnitud real lleva su unidad, no solo su nombre', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const text = wrapper.find('[data-test="conditions"]').text()
    expect(text).toContain('10–35 °C')
    expect(text).toContain('10–30 %')
    expect(text).toContain('6–10 h')
  })

  /**
   * Lo que no existe **conserva su fila** y marca su valor, en vez de desaparecer de la lectura:
   * una condición ausente y una condición pendiente no son lo mismo.
   */
  it('las condiciones que no existen ocupan su fila con el valor marcado', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    for (const test of ['exposure', 'environment'] as const) {
      const row = wrapper.find(`[data-test="${test}"]`)
      expect(row.exists(), `falta la fila ${test}`).toBe(true)
      expect(row.attributes('data-role')).toBe('condition')
      expect(row.attributes('data-mock')).toBe('true')
      expect(row.text()).toContain('T-17')
    }
  })

  /**
   * Escenario «El género se deduce del nombre científico». No es un dato inventado: es la primera
   * palabra del binomio, así que **no se marca**. Marcarlo sería mentir en la otra dirección.
   */
  it('deriva el género del binomio, y no lo marca como ejemplo', async () => {
    api.get.mockResolvedValue(care())

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    const genus = wrapper.find('[data-test="genus"]')
    expect(genus.text()).toContain('Echinocactus')
    expect(genus.text()).not.toContain('Echinocactus grusonii')
    expect(genus.attributes('data-mock')).toBeUndefined()
  })

  it('un nombre científico de una sola palabra no rompe el género', async () => {
    api.get.mockResolvedValue(care({ scientificName: 'Astrophytum' }))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="genus"]').text()).toContain('Astrophytum')
  })

  it('una especie inexistente se dice, con salida al catálogo y sin pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La especie '200001' no existe"))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('/species')
  })

  it('un fallo que no es un 404 se muestra como error, no como especie inexistente', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })
})
