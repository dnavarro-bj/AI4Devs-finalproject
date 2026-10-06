import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PlantEffectiveCare from '../src/features/plants/components/PlantEffectiveCare.vue'
import { effectiveCare, speciesCare } from './helpers/fixtures'

/**
 * Escenarios «La ficha distingue lo propio de lo heredado» y «Sin cuidados propios» de
 * «Cuidados propios y perfil efectivo en las pantallas».
 */
describe('perfil efectivo en la ficha', () => {
  const species = speciesCare()

  const mountCare = (care: ReturnType<typeof effectiveCare>) =>
    mountSuspended(PlantEffectiveCare, { props: { care, speciesName: 'Echinocactus grusonii' } })

  const row = (wrapper: Awaited<ReturnType<typeof mountCare>>, concept: string) =>
    wrapper.find(`[data-test="care-${concept}"]`)

  it('muestra el perfil efectivo: lo propio donde lo hay y lo de la especie donde no', async () => {
    const wrapper = await mountCare({ ...effectiveCare(species, ['minHumidity']), minHumidity: 12 })

    expect(row(wrapper, 'humidity').text()).toContain('12–30')
    expect(row(wrapper, 'temperature').text()).toContain('10–35')
    expect(row(wrapper, 'watering').text()).toContain('cada 10-20 dias')
    expect(row(wrapper, 'soil').text()).toContain('Mineral drenante')
  })

  it('cada valor lleva su marca en texto: «propio» o «de la especie»', async () => {
    const wrapper = await mountCare(effectiveCare(species, ['minHumidity', 'wateringGuideline']))

    expect(row(wrapper, 'humidity').find('[data-test="origin-mark"]').text().toLowerCase()).toContain('propio')
    expect(row(wrapper, 'watering').find('[data-test="origin-mark"]').text().toLowerCase()).toContain('propio')
    expect(row(wrapper, 'temperature').find('[data-test="origin-mark"]').text().toLowerCase()).toContain('de la especie')
    expect(row(wrapper, 'soil').find('[data-test="origin-mark"]').text().toLowerCase()).toContain('de la especie')
  })

  it('lo propio se distingue también por su forma, no solo por el color', async () => {
    const wrapper = await mountCare(effectiveCare(species, ['maxTemperature']))

    expect(row(wrapper, 'temperature').attributes('data-origin')).toBe('own')
    expect(row(wrapper, 'temperature').classes()).toContain('is-own')
    expect(row(wrapper, 'humidity').attributes('data-origin')).toBe('species')
    expect(row(wrapper, 'temperature').find('[data-test="origin-mark"]').text()).toContain('▪')
  })

  it('un solo extremo propio de un rango marca todo el rango como propio', async () => {
    const wrapper = await mountCare(effectiveCare(species, ['maxLightHours']))

    expect(row(wrapper, 'light').attributes('data-origin')).toBe('own')
  })

  it('sin cuidados propios lo dice y no marca nada como propio', async () => {
    const wrapper = await mountCare(effectiveCare(species, []))

    expect(wrapper.find('[data-test="inherits-all"]').text()).toContain('Hereda toda la pauta de su especie')
    expect(wrapper.findAll('[data-origin="own"]')).toHaveLength(0)
  })

  it('con cuidados propios dice cuántos conceptos se apartan de la especie', async () => {
    const wrapper = await mountCare(effectiveCare(species, ['minHumidity', 'maxHumidity', 'soilMix']))

    expect(wrapper.find('[data-test="inherits-all"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="own-summary"]').text()).toContain('2')
  })
})
