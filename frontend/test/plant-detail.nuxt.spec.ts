import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { careRecord, plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id].vue'
import { ApiError } from '../app/types/api'

const api = createApiDouble()
mockNuxtImport('useApi', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/**
 * Escenarios "Ficha de una planta existente", "Ficha de una planta sin tags",
 * "Ficha de una planta inexistente" y "Rangos en la ficha antes de registrar la lectura".
 */
describe('ficha de la planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
  })

  it('muestra nickname, localización, tags y los cuidados de su especie', async () => {
    api.get.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Bola verde')
    expect(text).toContain('Invernadero 1')
    expect(text).toContain('globular')
    expect(text).toContain('Echinocactus grusonii')
  })

  it('se pinta sin errores cuando la planta no tiene ningún tag', async () => {
    api.get.mockResolvedValue(plantDetail({ tags: [] }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bola verde')
    expect(wrapper.find('[data-test="tags"]').exists()).toBe(true)
  })

  /**
   * El API omite los valores no informados en lugar de mandarlos a `null`: llegan como
   * `undefined`, y la ficha no debe pintarlos como filas vacías.
   */
  it('solo lista los valores informados de la lectura registrada', async () => {
    api.get.mockResolvedValue(plantDetail())
    api.post.mockResolvedValue({
      id: '500001',
      plantId: '882687672222443468',
      recordedAt: '2026-09-02T09:00:00Z',
      humidity: 4,
    })
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await wrapper.find('[data-test="humidity"]').setValue('4')
    await wrapper.find('[data-test="care-record-form"]').trigger('submit')
    await settle()

    const reading = wrapper.find('[data-test="last-reading"]')
    expect(reading.text()).toContain('Humedad: 4')
    expect(reading.text()).not.toContain('Temperatura')
    expect(reading.text()).not.toContain('Acidez')
    expect(reading.findAll('li')).toHaveLength(1)
  })

  it('explica que la planta no existe y ofrece volver al inventario', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La planta '999999999' no existe"))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('no existe')
    expect(wrapper.find('[data-test="back-to-inventory"]').attributes('href')).toBe('/plants')
  })

  it('deja los rangos de la especie visibles junto al formulario de lectura, sin ninguna acción', async () => {
    api.get.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const ranges = wrapper.find('[data-test="species-ranges"]')
    expect(ranges.exists()).toBe(true)
    const text = ranges.text()
    expect(text).toContain('10')
    expect(text).toContain('30')
    expect(text).toContain('cada 10-20 dias')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(true)
  })
})
