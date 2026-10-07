import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { nursery, page, plantRow } from './helpers/locationFixtures'
import { speciesCare } from './helpers/fixtures'
import PlantsIndex from '../app/pages/plants/index.vue'
import NewPlantPage from '../app/pages/plants/new.vue'

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({
  params: {},
  query: { location: '300002', includeDescendants: 'true' },
}))

/**
 * Cómo se apoya el resto de la aplicación en la jerarquía: el inventario nace filtrado desde la
 * ficha de una localización —con sus sublocalizaciones— y los selectores de localización dicen la
 * ruta completa, no un nombre que puede repetirse.
 */
describe('las localizaciones en el inventario y en el alta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') return page(nursery())
      if (path === '/plants') return page([plantRow('400001', 'Asiento de suegra')])
      if (path === '/species') return page([{ id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' }])
      if (path === '/soil-mixes') return page([])
      if (path === '/species/200001') return speciesCare()
      throw new Error(`petición no doblada: ${path}`)
    })
  })

  it('el inventario nace filtrado por la localización de la URL, incluidas sus sublocalizaciones', async () => {
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.objectContaining({ location: '300002', includeDescendants: true }))
    expect(wrapper.text()).toContain('Localización: Bancada norte y sublocalizaciones')
  })

  it('el filtro de localización ofrece cada una con su ruta completa', async () => {
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()

    const options = wrapper.find('[data-test="filter-location"]').findAll('option').map((option) => option.text())
    expect(options).toContain('Invernadero 1 / Bancada norte / Bandeja A3')
  })

  it('quitar el filtro quita también lo de las sublocalizaciones', async () => {
    const wrapper = await mountSuspended(PlantsIndex)
    await settle()
    api.get.mockClear()

    await wrapper.find('[data-test="filter-location"]').setValue('')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/plants', expect.not.objectContaining({ location: expect.anything() }))
    expect(api.get).toHaveBeenCalledWith('/plants', expect.not.objectContaining({ includeDescendants: expect.anything() }))
  })

  it('el alta ofrece cada localización con su ruta y dice cuántos ejemplares tiene la elegida', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    const select = wrapper.find('[data-test="location"]')
    expect(select.findAll('option').map((option) => option.text())).toContain('Invernadero 1 / Bancada norte')

    await select.setValue('300002')

    const picked = wrapper.find('.location-picked')
    expect(picked.text()).toContain('Invernadero 1 / Bancada norte')
    expect(picked.find('[data-test="location-load"]').text()).toContain('62 plantas')
    expect(picked.text()).not.toContain('T-18')
  })
})
