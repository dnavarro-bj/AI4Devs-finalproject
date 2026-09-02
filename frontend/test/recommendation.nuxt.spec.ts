import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble } from './helpers/apiDouble'
import { careRecord, recommendation } from './helpers/fixtures'
import RecommendationPanel from '../app/components/RecommendationPanel.vue'
import { ApiError } from '../app/types/api'

const api = createApiDouble()
mockNuxtImport('useApi', () => () => api)

const plantId = '882687672222443468'

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Escenarios "Análisis generado", "Lectura que ya tiene análisis", "Análisis en curso" y
 * "El proveedor de IA falla".
 */
describe('análisis de IA de una lectura', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
  })

  it('muestra riesgo, explicación, acción y prioridad del análisis generado', async () => {
    api.post.mockResolvedValue(recommendation())
    const wrapper = await mountSuspended(RecommendationPanel, {
      props: { plantId, careRecord: careRecord() },
    })

    await wrapper.find('[data-test="generate"]').trigger('click')
    await settle()

    const text = wrapper.text()
    expect(text).toContain('La humedad está por debajo del rango recomendado.')
    expect(text).toContain('Riega en profundidad y revisa el drenaje.')
    expect(wrapper.find('[data-test="risk"]').classes()).toContain('risk--high')
    expect(wrapper.find('[data-test="priority"]').text().toLowerCase()).toContain('inmediata')
  })

  it('muestra el análisis existente sin pedir que se genere otro', async () => {
    const wrapper = await mountSuspended(RecommendationPanel, {
      props: { plantId, careRecord: careRecord({ recommendation: recommendation() }) },
    })
    await settle()

    expect(wrapper.text()).toContain('La humedad está por debajo del rango recomendado.')
    expect(api.post).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="generate"]').exists()).toBe(false)
  })

  it('avisa de que está generando y no lanza una segunda petición', async () => {
    let release: (value: unknown) => void = () => {}
    api.post.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const wrapper = await mountSuspended(RecommendationPanel, {
      props: { plantId, careRecord: careRecord() },
    })

    await wrapper.find('[data-test="generate"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="generating"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="generate"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="generate"]').trigger('click')
    await settle()
    expect(api.post).toHaveBeenCalledTimes(1)

    release(recommendation())
    await settle()
  })

  it('explica el fallo del proveedor, ofrece reintentar y no rompe el resto', async () => {
    api.post.mockRejectedValue(new ApiError(502, 'El proveedor de análisis no está disponible'))
    const wrapper = await mountSuspended(RecommendationPanel, {
      props: { plantId, careRecord: careRecord() },
    })

    await wrapper.find('[data-test="generate"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('El proveedor de análisis no está disponible')
    const retry = wrapper.find('[data-test="generate"]')
    expect(retry.exists()).toBe(true)
    expect(retry.attributes('disabled')).toBeUndefined()

    api.post.mockResolvedValue(recommendation())
    await retry.trigger('click')
    await settle()
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Riega en profundidad y revisa el drenaje.')
  })
})
