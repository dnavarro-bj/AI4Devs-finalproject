import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { careRecord, plantDetail, recommendation, speciesCare } from './helpers/fixtures'
import NewPlantPage from '../app/pages/plants/new.vue'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'

const api = createApiDouble()
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('navigateTo', () => navigate)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))


/**
 * Escenario "Flujo completo sin recarga manual": alta → ficha → lectura → análisis, en una sola
 * sesión y sin que el usuario recargue la página en ningún momento.
 */
describe('flujo completo', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    navigate.mockReset()
    clearNuxtState()
  })

  it('recorre alta, lectura y análisis sin una sola recarga', async () => {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') {
        return { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      }
      if (path === '/species') {
        return { content: [{ id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      }
      if (path === '/species/200001') return speciesCare()
      if (path === '/plants/882687672222443468') return plantDetail()
      // La ficha estrena el historial de lecturas, que hasta ahora nadie consumía.
      if (path === '/plants/882687672222443468/care-records') {
        return { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 25 }
      }
      throw new Error(`ruta inesperada: ${path}`)
    })

    // 1. Alta de la planta, con los rangos de la especie a la vista antes de crearla.
    api.post.mockResolvedValueOnce(plantDetail())
    const create = await mountSuspended(NewPlantPage)
    await settle()
    await create.find('[data-test="nickname"]').setValue('Bola verde')
    await create.find('[data-test="location"]').setValue('300001')
    await create.find('[data-test=\"species-200001\"]').trigger('click')
    await settle()
    expect(create.find('[data-test="species-ranges"]').exists()).toBe(true)

    await create.find('form').trigger('submit')
    await settle()
    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')

    // 2. La ficha, con los rangos visibles antes de guardar la lectura.
    const detail = await mountSuspended(PlantDetailPage)
    await settle()
    expect(detail.find('[data-test="species-ranges"]').exists()).toBe(true)

    // 3. La lectura, que la ficha refleja en su cronología sin recarga. El formulario vive ahora
    //    en un diálogo, así que hay que abrirlo.
    api.post.mockResolvedValueOnce(careRecord())
    await detail.find('[data-test="register-reading"]').trigger('click')
    await detail.find('[data-test="humidity"]').setValue('8')
    await detail.find('[data-test="care-record-form"]').trigger('submit')
    await settle()
    expect(detail.find('[data-test="reading-500001"]').exists()).toBe(true)

    // 4. El análisis de esa lectura, en la misma pantalla.
    api.post.mockResolvedValueOnce(recommendation())
    await detail.find('[data-test="generate"]').trigger('click')
    await settle()
    expect(detail.text()).toContain('Riega en profundidad y revisa el drenaje.')
    expect(detail.find('[data-test="risk"]').classes()).toContain('risk--high')
  })
})
