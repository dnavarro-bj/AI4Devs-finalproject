import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { movement, page } from './helpers/locationFixtures'
import PlantMovementHistory from '../src/features/locations/components/PlantMovementHistory.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** Escenario «Historial en la ficha del ejemplar»: origen, destino y fecha; la cronología es T-20. */
describe('historial de movimientos de un ejemplar', () => {
  beforeEach(() => { api.get.mockReset() })

  async function mountHistory() {
    const wrapper = await mountSuspended(PlantMovementHistory, { props: { plantId: '882' } })
    await settle()
    return wrapper
  }

  it('lista los movimientos encadenados, el más reciente primero, con origen, destino y fecha', async () => {
    api.get.mockResolvedValue(page([
      movement({ id: '2', from: { id: '300002', name: 'Bancada norte' }, to: { id: '300003', name: 'Bandeja A3' }, movedAt: '2026-10-06T10:00:00Z' }),
      movement({ id: '1', from: { id: '300005', name: 'Cuarentena' }, to: { id: '300002', name: 'Bancada norte' }, movedAt: '2026-09-01T10:00:00Z' }),
    ]))

    const wrapper = await mountHistory()

    const routes = wrapper.findAll('[data-test="movement-route"]').map((route) => route.text())
    expect(routes).toEqual(['Bancada norte → Bandeja A3', 'Cuarentena → Bancada norte'])
    expect(wrapper.find('[data-test="movement"] time').attributes('datetime')).toBe('2026-10-06T10:00:00Z')
    expect(api.get).toHaveBeenCalledWith('/plants/882/movements', { page: 0 })
  })

  it('un ejemplar que nunca se ha movido lo dice, en vez de dejar un hueco', async () => {
    api.get.mockResolvedValue(page([]))

    const wrapper = await mountHistory()

    expect(wrapper.find('[data-test="no-movements"]').exists()).toBe(true)
  })

  it('un fallo se dice en su bloque', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await mountHistory()

    expect(wrapper.find('[data-test="movements-error"]').exists()).toBe(true)
  })
})
