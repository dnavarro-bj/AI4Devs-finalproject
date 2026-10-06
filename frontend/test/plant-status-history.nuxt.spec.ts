import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import PlantStatusHistory from '../src/features/plants/components/PlantStatusHistory.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/** Escenario «Historial de cambios»: del más reciente al más antiguo, con fecha, estados y motivo. */
describe('historial de cambios de estado', () => {
  beforeEach(() => { api.get.mockReset() })

  const page = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })

  const mountHistory = async () => {
    const wrapper = await mountSuspended(PlantStatusHistory, { props: { plantId: '1', version: 0 } })
    await settle()
    return wrapper
  }

  it('lista los cambios en el orden en que llegan —el más reciente primero— con sus estados y su motivo', async () => {
    api.get.mockResolvedValue(page([
      { id: '3', fromStatus: 'cuarentena', toStatus: 'vendida', reason: 'A un coleccionista', occurredAt: '2026-09-03T10:00:00Z' },
      { id: '2', fromStatus: 'activa', toStatus: 'cuarentena', occurredAt: '2026-08-01T09:00:00Z' },
    ]))

    const wrapper = await mountHistory()

    const rows = wrapper.findAll('[data-test="status-change"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Vendida')
    expect(rows[0]!.text()).toContain('A un coleccionista')
    expect(rows[1]!.text()).toContain('En cuarentena')
    expect(api.get).toHaveBeenCalledWith('/plants/1/status-changes', { page: 0 })
  })

  it('cada cambio lleva su fecha', async () => {
    api.get.mockResolvedValue(page([
      { id: '2', fromStatus: 'activa', toStatus: 'cuarentena', occurredAt: '2026-08-01T09:00:00Z' },
    ]))

    const wrapper = await mountHistory()

    expect(wrapper.find('[data-test="status-change"] time').attributes('datetime')).toBe('2026-08-01T09:00:00Z')
  })

  it('un ejemplar sin cambios lo dice, en vez de dejar un hueco', async () => {
    api.get.mockResolvedValue(page([]))

    const wrapper = await mountHistory()

    expect(wrapper.find('[data-test="no-changes"]').exists()).toBe(true)
  })

  it('un fallo al cargar el historial se dice y no rompe la ficha', async () => {
    api.get.mockImplementation(async () => { throw new ApiError(500, 'No se ha podido completar la operación.') })

    const wrapper = await mountHistory()

    expect(wrapper.find('[data-test="history-error"]').exists()).toBe(true)
  })

  it('cambiar la versión recarga el historial: así se refresca tras un cambio de estado', async () => {
    api.get.mockResolvedValue(page([]))
    const wrapper = await mountHistory()

    await wrapper.setProps({ version: 1 })
    await settle()

    expect(api.get).toHaveBeenCalledTimes(2)
  })
})
