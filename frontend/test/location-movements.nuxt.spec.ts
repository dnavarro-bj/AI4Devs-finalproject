import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { createApiDouble, settle } from './helpers/apiDouble'
import { detail, movement, page } from './helpers/locationFixtures'
import LocationMovements from '../app/pages/locations/[id]/movements.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300002' }, query: {} }))

/** Escenarios de «Historial de movimientos» desde la ficha de una localización. */
describe('historial de movimientos de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
  })

  const history = () => [
    movement({ id: '1', plantCode: 'CAT-GRUSS-01', to: { id: '300002', name: 'Bancada norte' }, from: { id: '300005', name: 'Cuarentena' } }),
    movement({ id: '2', plantCode: 'CAT-GRUSS-02', from: { id: '300002', name: 'Bancada norte' }, to: { id: '300004', name: 'Bandeja A4' } }),
  ]

  function serve(movements = history(), extra: Record<string, unknown> = {}) {
    api.get.mockImplementation(async (path: string) => {
      if (path === '/locations/300002') return detail()
      if (path === '/locations/300002/movements') return page(movements, extra)
      throw new Error(`petición no doblada: ${path}`)
    })
  }

  async function open() {
    const wrapper = await mountSuspended(LocationMovements)
    await settle()
    return wrapper
  }

  it('lista los movimientos con su sentido, tal como los sirve el API (el más reciente primero)', async () => {
    serve()
    const wrapper = await open()

    const items = wrapper.findAll('[data-test="movement"]')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('CAT-GRUSS-01')
    expect(items[0]!.text()).toContain('recibida desde Cuarentena')
    expect(items[1]!.text()).toContain('cedida a Bandeja A4')
  })

  it('dice cuántos movimientos hay y a quién pertenece la ficha', async () => {
    serve()
    const wrapper = await open()

    expect(wrapper.find('[data-test="movements-total"]').text()).toContain('2 movimientos')
    expect(wrapper.text()).toContain('Movimientos de Bancada norte')
  })

  it('los breadcrumbs llevan la ruta real hasta la ficha', async () => {
    serve()
    await open()

    expect(useBreadcrumbs().breadcrumbs.value.map((crumb) => crumb.label))
      .toEqual(['Localizaciones', 'Invernadero 1', 'Bancada norte', 'Movimientos'])
  })

  it('pide la página siguiente al paginar', async () => {
    serve(history(), { totalPages: 3, totalElements: 30 })
    const wrapper = await open()
    api.get.mockClear()

    await wrapper.find('nav button:last-of-type').trigger('click')
    await settle()

    expect(api.get).toHaveBeenCalledWith('/locations/300002/movements', { page: 1 })
  })

  it('sin movimientos lo dice', async () => {
    serve([])
    const wrapper = await open()

    expect(wrapper.find('[data-test="no-movements"]').exists()).toBe(true)
  })

  it('una localización inexistente lo explica', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La localización '300002' no existe"))
    const wrapper = await open()

    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('un fallo al cargar se muestra, y no deja la pantalla en blanco', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))
    const wrapper = await open()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })
})
