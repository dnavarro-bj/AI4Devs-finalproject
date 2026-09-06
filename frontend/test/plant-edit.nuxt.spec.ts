import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail, speciesCare } from './helpers/fixtures'
import EditPlantPage from '../app/pages/plants/[id]/edit.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/**
 * Escenarios "Edición prellenada" y "Campo que el API no admite guardar" de la requirement
 * "Alta y edición de una planta con el mismo formulario" (`plant-dashboard`).
 */
describe('edición de una planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    clearNuxtState()
  })

  function serve() {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') {
        return { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      }
      if (path === '/species') {
        return { content: [{ id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      }
      if (path === '/species/200001') return speciesCare()
      return plantDetail()
    })
  }

  it('llega prellenada con los valores actuales de la planta', async () => {
    serve()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('Bola verde')
    expect((wrapper.find('[data-test="location"]').element as HTMLSelectElement).value).toBe('300001')
    // La especie se elige de una lista de tarjetas: prellenada significa que la suya está marcada.
    expect(wrapper.find('[data-test="species-200001"]').attributes('aria-checked')).toBe('true')
  })

  it('usa el mismo formulario que el alta, por secciones', async () => {
    serve()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect(wrapper.find('[data-test="plant-form"]').exists()).toBe(true)
    // Las seis secciones del wireframe, con su navegación.
    expect(wrapper.findAll('.form-section')).toHaveLength(6)
    expect(wrapper.find('nav[aria-label="Secciones del formulario"]').exists()).toBe(true)
  })

  it('advierte de que el API todavía no guarda el resto de campos, y no simula que sí', async () => {
    serve()
    api.put.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="nickname"]').setValue('Otro nombre')
    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    const warning = wrapper.find('[data-test="partial-save"]')
    expect(warning.exists()).toBe(true)
    expect(warning.text().toLowerCase()).toContain('no se ha guardado')
    // Y no se inventa una petición que el API no expone.
    expect(api.post).not.toHaveBeenCalled()
  })
})
