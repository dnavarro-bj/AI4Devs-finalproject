import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { ApiError } from '@shared/services/httpClient'
import { plantDetail, speciesCare } from './helpers/fixtures'
import EditPlantPage from '../app/pages/plants/[id]/edit.vue'

const api = createApiDouble()
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('navigateTo', () => navigate)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/**
 * Escenarios "Edición prellenada", "Edición guardada", "Edición sin avisos de guardado parcial" y
 * "Edición rechazada por el API" de la requirement "Alta y edición de una planta con el mismo
 * formulario" (`plant-dashboard`).
 */
describe('edición de una planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    navigate.mockReset()
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

  it('guarda de verdad: envía la planta entera y lleva a su ficha', async () => {
    serve()
    api.put.mockResolvedValue(plantDetail({ nickname: 'Otro nombre' }))
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="nickname"]').setValue('Otro nombre')
    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468', {
      nickname: 'Otro nombre',
      locationId: '300001',
      speciesId: '200001',
    })
    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')
  })

  it('una edición correcta no lleva ningún aviso de guardado parcial', async () => {
    serve()
    api.put.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="partial-save"]').exists()).toBe(false)
    expect(wrapper.text().toLowerCase()).not.toContain('no se han guardado')
  })

  it('si el API rechaza la edición, explica el motivo y no pierde lo escrito', async () => {
    serve()
    api.put.mockRejectedValue(new ApiError(400, "La localización '300001' no existe"))
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="nickname"]').setValue('Nombre nuevo')
    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('no existe')
    expect(navigate).not.toHaveBeenCalled()
    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('Nombre nuevo')
  })

  it('el pie del formulario ya no excusa un guardado parcial', async () => {
    serve()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect(wrapper.find('.editor__impact').text().toLowerCase()).not.toContain('el resto llega')
  })
})
