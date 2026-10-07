import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantsIndex from '../app/pages/plants/index.vue'

enableAutoUnmount(afterEach)

const api = createApiDouble({ savedViews: true })
mockNuxtImport('getApiClient', () => () => api)

/**
 * Requirement «Filtros, orden y columnas del inventario viven en la URL»: recargar o compartir el
 * enlace reproduce la pantalla, y lo desconocido o inválido de la URL se ignora sin romperla.
 */
describe('inventario: el estado vive en la URL', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations') {
        return { content: [{ id: '300001', name: 'Invernadero 1' }], totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25 }
      }
      if (path === '/species') {
        return {
          content: [{ id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'x' }],
          totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 500,
        }
      }
      return {
        content: [{
          id: '1', code: 'CAT-GRUSS-01', nickname: 'Bola verde', createdAt: '2026-09-01T10:00:00Z',
          location: { id: '300001', name: 'Invernadero 1' },
          species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'x' },
        }],
        totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 25,
      }
    })
  })

  const plantsCalls = () => api.get.mock.calls.filter(([path]) => path === '/plants')
  const lastPlantsCall = () => plantsCalls().at(-1)![1] as Record<string, unknown>
  const currentQuery = () => useRouter().currentRoute.value.query

  it('un enlace con filtros y orden llega ya filtrado y ordenado, con sus criterios a la vista', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants?species=200001&sort=species,asc&q=bola&exposure=pleno_sol' })
    await settle()

    expect(lastPlantsCall()).toMatchObject({ species: ['200001'], sort: 'species,asc', q: 'bola', exposure: ['pleno_sol'] })
    const chips = wrapper.findAll('.filter-chip').map((chip) => chip.text())
    expect(chips.some((text) => text.includes('Especie: Echinocactus grusonii'))).toBe(true)
    expect(chips.some((text) => text.includes('Búsqueda: bola'))).toBe(true)
    expect((wrapper.find('[data-test="filter-search"]').element as HTMLInputElement).value).toBe('bola')
    expect(wrapper.find('th.is-sorted').text()).toContain('Especie')
  })

  it('las columnas ocultas se reproducen desde la URL', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants?hide=status&hide=lastWatering' })
    await settle()

    const headers = wrapper.findAll('thead th').map((th) => th.text().replace(/[↕↑↓]/g, '').trim()).filter(Boolean)
    expect(headers).toEqual(['Planta', 'Especie', 'Localización', 'Atención', 'Acciones'])
  })

  it('cambiar un criterio, el orden o una columna escribe la URL', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await wrapper.find('[data-test="filter-species"]').setValue('200001')
    await wrapper.find('[data-test="sort-select"]').setValue('location,desc')
    await wrapper.find('[data-test="configure-columns"]').trigger('click')
    await wrapper.find('[data-test="columns-picker"] input[value="attention"]').setValue(false)
    await settle()

    await vi.waitFor(() => expect(currentQuery()).toEqual({
      species: '200001', sort: 'location,desc', hide: ['attention'],
    }))
  })

  it('cambiar una columna visible no vuelve a pedir el listado', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()
    const before = plantsCalls().length

    await wrapper.find('[data-test="configure-columns"]').trigger('click')
    await wrapper.find('[data-test="columns-picker"] input[value="attention"]').setValue(false)
    await settle()

    expect(plantsCalls().length).toBe(before)
  })

  it('un parámetro inválido o desconocido se ignora, sin error', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants?status=resucitada&exposure=playa&sort=password,asc&colour=red' })
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(lastPlantsCall()).toEqual({ page: 0 })
    expect(wrapper.find('.filter-chip').exists()).toBe(false)
  })

  it('el enlace de la ficha de una localización sigue funcionando', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants?location=300001&includeDescendants=true' })
    await settle()

    expect(lastPlantsCall()).toMatchObject({ location: '300001', includeDescendants: true })
    expect(wrapper.find('.filter-chip').text()).toContain('Invernadero 1 y sublocalizaciones')
  })

  it('un enlace que llega con otra búsqueda mientras la pantalla está abierta la aplica', async () => {
    const wrapper = await mountSuspended(PlantsIndex, { route: '/plants' })
    await settle()

    await useRouter().push('/plants?q=grusonii')
    await settle()

    expect(lastPlantsCall()).toMatchObject({ q: 'grusonii' })
    expect((wrapper.find('[data-test="filter-search"]').element as HTMLInputElement).value).toBe('grusonii')
  })
})
