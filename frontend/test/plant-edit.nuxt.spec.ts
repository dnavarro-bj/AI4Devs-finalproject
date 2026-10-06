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

  /** Escenario «Código real en la ficha y en la edición»: el del API, y de solo lectura. */
  it('muestra el código real de la planta, de solo lectura', async () => {
    serve()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect(wrapper.find('[data-test="code-preview"]').text()).toContain('CAT-GRUSS-01')
    expect(wrapper.find('[data-test="locked-code"]').text()).toContain('CAT-GRUSS-01')
    expect(wrapper.find('input[data-test="locked-code"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="code-block"]').attributes('data-mock')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Dato de ejemplo hasta T-15')
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

  // --- Ficha ampliada (`ficha-del-ejemplar`) ---

  it('llega prellenada con la ficha ampliada de la planta', async () => {
    serve()
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') return { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      if (path === '/species') return { content: [{ id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      if (path === '/species/200001') return speciesCare()
      return plantDetail({ description: 'Adulto', germinationYear: 2021, germinationMonth: 4, acquiredOn: '2022-03-01', origin: 'vivero', originNote: 'El del barrio' })
    })
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect((wrapper.find('[data-test="description"]').element as HTMLTextAreaElement).value).toBe('Adulto')
    expect((wrapper.find('[data-test="germination-year"]').element as HTMLInputElement).value).toBe('2021')
    expect((wrapper.find('[data-test="germination-month"]').element as HTMLSelectElement).value).toBe('4')
    expect((wrapper.find('[data-test="acquired-on"]').element as HTMLInputElement).value).toBe('2022-03-01')
    expect((wrapper.find('[data-test="origin"]').element as HTMLSelectElement).value).toBe('vivero')
    expect((wrapper.find('[data-test="origin-note"]').element as HTMLInputElement).value).toBe('El del barrio')
  })

  it('la edición no ofrece cambiar el estado: tiene su propia acción en la ficha', async () => {
    serve()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect(wrapper.find('[data-test="status"]').exists()).toBe(false)
  })

  it('guardar envía la ficha completa y nunca el estado', async () => {
    serve()
    api.put.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="description"]').setValue('Nueva descripción')
    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    const body = api.put.mock.calls[0]![1] as Record<string, unknown>
    expect(body).toMatchObject({ nickname: 'Bola verde', description: 'Nueva descripción' })
    expect(body).not.toHaveProperty('status')
  })

  // --- Cuidados propios (`cuidados-por-ejemplar`) ---

  function serveWithCare() {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') return { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      if (path === '/species') return { content: [{ id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      if (path === '/species/200001') return speciesCare()
      if (path === '/soil-mixes') return { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 }
      return plantDetail({ careOverrides: { wateringGuideline: 'cada 5 dias', maxTemperature: 30 } })
    })
  }

  it('la edición de un ejemplar con cuidados propios llega con la personalización activa y sus valores', async () => {
    serveWithCare()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect(wrapper.find('[data-test="override-toggle"]').attributes('aria-checked')).toBe('true')
    expect((wrapper.find('[data-test="care-watering"]').element as HTMLInputElement).value).toBe('cada 5 dias')
    expect((wrapper.find('[data-test="care-max-temperature"]').element as HTMLInputElement).value).toBe('30')
    // Lo no sobrescrito queda vacío: se hereda.
    expect((wrapper.find('[data-test="care-min-humidity"]').element as HTMLInputElement).value).toBe('')
  })

  it('guardar envía los cuidados propios dentro de la ficha', async () => {
    serveWithCare()
    api.put.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    expect(api.put.mock.calls[0]![1]).toMatchObject({ careOverrides: { wateringGuideline: 'cada 5 dias', maxTemperature: 30 } })
  })

  it('desactivar la personalización en la edición quita los cuidados propios', async () => {
    serveWithCare()
    api.put.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    await wrapper.find('[data-test="override-toggle"]').trigger('click')
    await wrapper.find('[data-test="plant-form"]').trigger('submit')
    await settle()

    expect(api.put.mock.calls[0]![1]).not.toHaveProperty('careOverrides')
  })

  it('un ejemplar sin cuidados propios llega con la personalización desactivada', async () => {
    serve()
    const wrapper = await mountSuspended(EditPlantPage)
    await settle()

    expect(wrapper.find('[data-test="override-toggle"]').attributes('aria-checked')).toBe('false')
  })
})
