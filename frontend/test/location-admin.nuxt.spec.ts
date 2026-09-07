import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import LocationDetail from '../app/pages/locations/[id]/index.vue'
import type { LocationDetail as LocationDetailModel } from '@features/catalogs/types/catalog.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300001' } }))

/** `mockNuxtImport` se iza, así que el doble tiene que existir antes: de ahí `vi.hoisted`. */
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('navigateTo', () => navigate)

/** Escenarios de la requirement «Administración de una localización», salvo el alta. */
describe('administración de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    navigate.mockReset()
  })

  const location = (plantCount: number): LocationDetailModel => ({
    id: '300001',
    name: 'Invernadero 1',
    plantCount,
  })

  const plant = (id: string): PlantSummary => ({
    id,
    nickname: 'Asiento de suegra',
    createdAt: null,
    location: { id: '300001', name: 'Invernadero 1' },
    species: { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
  })

  const plantsPage = (content: PlantSummary[]): PageResponse<PlantSummary> => ({
    content,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    pageNumber: 0,
    pageSize: 25,
  })

  function respond(plantCount: number) {
    const plants = plantCount ? [plant('400001')] : []
    api.get.mockImplementation((path: string) => {
      if (path === '/locations/300001') return Promise.resolve(location(plantCount))
      return Promise.resolve(plantsPage(plants))
    })
  }

  it('corrige el nombre desde la ficha, sin tocar los ejemplares que alberga', async () => {
    respond(3)
    api.put.mockResolvedValue({ id: '300001', name: 'Invernadero principal' })

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    await wrapper.find('[data-test="rename-location"]').trigger('click')
    await wrapper.find('[data-test="rename-name"]').setValue('Invernadero principal')
    await wrapper.find('[data-test="rename-submit"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/locations/300001', { name: 'Invernadero principal' })
    expect(wrapper.text()).toContain('Invernadero principal')
    expect(wrapper.find('[data-test="plant-count"]').text()).toContain('3')
  })

  it('un nombre rechazado se explica junto al formulario, sin perder la ficha', async () => {
    respond(1)
    api.put.mockRejectedValue(new ApiError(400, 'name: el nombre es obligatorio'))

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    await wrapper.find('[data-test="rename-location"]').trigger('click')
    await wrapper.find('[data-test="rename-name"]').setValue('   ')
    await wrapper.find('[data-test="rename-submit"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="rename-error"]').text()).toContain('obligatorio')
    expect(wrapper.text()).toContain('Invernadero 1')
  })

  it('retira una localización vacía tras confirmarlo y vuelve al catálogo', async () => {
    respond(0)
    api.delete.mockResolvedValue(undefined)

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    await wrapper.find('[data-test="remove-location"]').trigger('click')
    await wrapper.find('[data-test="confirm-removal"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/locations/300001')
    expect(navigate).toHaveBeenCalledWith('/locations')
  })

  /** El `409` no se cuenta como «conflicto»: se dice cuántos ejemplares hay y se ofrece verlos. */
  it('la retirada bloqueada dice cuántos ejemplares hay y ofrece verlos', async () => {
    respond(31)
    api.delete.mockRejectedValue(
      new ApiError(409, "La localización '300001' alberga ejemplares y no se puede eliminar"),
    )

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    await wrapper.find('[data-test="remove-location"]').trigger('click')

    const dialog = wrapper.find('[data-test="remove-dialog"]')
    expect(dialog.text()).toContain('31')
    expect(wrapper.find('[data-test="see-plants"]').attributes('href')).toBe('/plants?location=300001')
    expect(wrapper.find('[data-test="confirm-removal"]').exists()).toBe(false)
  })

  it('un conflicto devuelto por el API se explica con su mensaje, y no se navega', async () => {
    respond(0)
    api.delete.mockRejectedValue(
      new ApiError(409, "La localización '300001' alberga ejemplares y no se puede eliminar"),
    )

    const wrapper = await mountSuspended(LocationDetail)
    await settle()

    await wrapper.find('[data-test="remove-location"]').trigger('click')
    await wrapper.find('[data-test="confirm-removal"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="remove-error"]').text()).toContain('no se puede eliminar')
    expect(navigate).not.toHaveBeenCalled()
  })
})
