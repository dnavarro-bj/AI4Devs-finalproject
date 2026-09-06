import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail, speciesCare } from './helpers/fixtures'
import NewPlantPage from '../app/pages/plants/new.vue'
import { ApiError } from '@shared/services/httpClient'

const api = createApiDouble()
// `mockNuxtImport` se iza: la fábrica evalúa `navigate` antes de que el `const` exista, así que
// tiene que venir de `vi.hoisted`.
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('navigateTo', () => navigate)

const locationsPage = {
  content: [{ id: '300001', name: 'Invernadero 1' }, { id: '300002', name: 'Bandeja A3' }],
  totalElements: 2, totalPages: 1, pageNumber: 0, pageSize: 25,
}

const speciesPage = {
  content: [
    { id: '200001', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
    { id: '200002', scientificName: 'Mammillaria elongata', commonName: 'Dedo de dama' },
  ],
  totalElements: 2, totalPages: 1, pageNumber: 0, pageSize: 25,
}

/** El catálogo devuelve el resumen; los rangos llegan de `GET /species/{id}` (decisión 1). */
function catalogs() {
  api.get.mockImplementation(async (path: string) => {
    if (path === '/locations') return locationsPage
    if (path === '/species') return speciesPage
    if (path === '/species/200001') return speciesCare()
    if (path === '/species/200002') {
      return speciesCare({
        id: '200002',
        scientificName: 'Mammillaria elongata',
        commonName: 'Dedo de dama',
        minHumidity: 15,
        maxHumidity: 40,
        wateringGuideline: 'cada 7-14 dias',
      })
    }
    throw new Error(`ruta inesperada: ${path}`)
  })
}

async function fill(wrapper: Awaited<ReturnType<typeof mountSuspended>>, opts: {
  nickname?: string, locationId?: string, speciesId?: string
}) {
  if (opts.nickname !== undefined) await wrapper.find('[data-test="nickname"]').setValue(opts.nickname)
  if (opts.locationId !== undefined) await wrapper.find('[data-test="location"]').setValue(opts.locationId)
  if (opts.speciesId !== undefined) await wrapper.find('[data-test="species"]').setValue(opts.speciesId)
  await settle()
}

describe('alta de una planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    navigate.mockReset()
    // La caché de fichas de especie vive en el estado de la aplicación: se limpia entre tests para
    // que cada uno parta de cero y no dependa del orden.
    clearNuxtState()
    catalogs()
  })

  it('crea la planta y lleva a su ficha sin recarga', async () => {
    api.post.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/plants', {
      nickname: 'Bola verde',
      locationId: '300001',
      speciesId: '200001',
    })
    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')
  })

  it('señala que el nickname es obligatorio y no envía la petición', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: '   ', locationId: '300001', speciesId: '200001' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="nickname-error"]').exists()).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('señala el catálogo que falta y no envía la petición', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="location-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="species-error"]').exists()).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('muestra el error del API conservando lo escrito y permite reintentar', async () => {
    api.post.mockRejectedValue(new ApiError(400, "La localización '999' no existe"))
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain("La localización '999' no existe")
    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('Bola verde')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('muestra los rangos de la especie elegida antes de crear la planta', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    expect(wrapper.find('[data-test="species-ranges"]').exists()).toBe(false)

    await fill(wrapper, { speciesId: '200001' })

    const ranges = wrapper.find('[data-test="species-ranges"]')
    expect(ranges.exists()).toBe(true)
    expect(ranges.text()).toContain('cada 10-20 dias')
    expect(api.get).toHaveBeenCalledWith('/species/200001')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('cambia los rangos al cambiar de especie, y no repite la llamada si se vuelve a una ya vista', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { speciesId: '200001' })
    await fill(wrapper, { speciesId: '200002' })
    expect(wrapper.find('[data-test="species-ranges"]').text()).toContain('cada 7-14 dias')

    const callsBefore = api.get.mock.calls.filter((c: unknown[]) => c[0] === '/species/200001').length
    await fill(wrapper, { speciesId: '200001' })
    const callsAfter = api.get.mock.calls.filter((c: unknown[]) => c[0] === '/species/200001').length

    expect(wrapper.find('[data-test="species-ranges"]').text()).toContain('cada 10-20 dias')
    expect(callsAfter).toBe(callsBefore)
  })
})
