import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { detail, plantRow, serveLocation } from './helpers/locationFixtures'
import LocationDetail from '../app/pages/locations/[id]/index.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '300002' }, query: {} }))

/** `mockNuxtImport` se iza, así que el doble tiene que existir antes: de ahí `vi.hoisted`. */
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('navigateTo', () => navigate)

/** Escenarios de «Administración de una localización» que viven en la ficha: la retirada. */
describe('retirada de una localización', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    navigate.mockReset()
  })

  const empty = () => detail({ children: [], plantCount: 0, plantCountTotal: 0 })

  async function open() {
    const wrapper = await mountSuspended(LocationDetail)
    await settle()
    return wrapper
  }

  it('retira una localización vacía tras confirmarlo y vuelve al catálogo', async () => {
    serveLocation(api, { detail: empty() })
    api.delete.mockResolvedValue(undefined)
    const wrapper = await open()

    await wrapper.find('[data-test="remove-location"]').trigger('click')
    await wrapper.find('[data-test="confirm-removal"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/locations/300002')
    expect(navigate).toHaveBeenCalledWith('/locations')
  })

  /** El `409` no se cuenta como «conflicto»: se dice cuántos ejemplares hay y se ofrece verlos. */
  it('bloqueada por ejemplares: dice cuántos hay y ofrece verlos', async () => {
    serveLocation(api, { detail: detail({ children: [], plantCount: 31, plantCountTotal: 31 }), plants: [plantRow('400001', 'Bola')] })
    const wrapper = await open()

    await wrapper.find('[data-test="remove-location"]').trigger('click')

    const dialog = wrapper.find('[data-test="remove-dialog"]')
    expect(dialog.find('[data-test="blocked-by-plants"]').text()).toContain('31')
    expect(wrapper.find('[data-test="see-plants"]').attributes('href')).toBe('/plants?location=300002')
    expect(wrapper.find('[data-test="confirm-removal"]').exists()).toBe(false)
  })

  it('bloqueada por sublocalizaciones: dice cuáles y ofrece verlas, aunque estén vacías', async () => {
    serveLocation(api, { detail: detail({ plantCount: 0, plantCountTotal: 0 }) })
    const wrapper = await open()

    await wrapper.find('[data-test="remove-location"]').trigger('click')

    const message = wrapper.find('[data-test="blocked-by-children"]')
    expect(message.exists(), 'el motivo es la jerarquía, no los ejemplares').toBe(true)
    expect(message.text()).toContain('2 sublocalizaciones')
    expect(wrapper.find('[data-test="blocked-by-plants"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="see-children"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="confirm-removal"]').exists()).toBe(false)
  })

  it('un conflicto devuelto por el API —un movimiento, una carrera— se explica con su mensaje, y no se navega', async () => {
    serveLocation(api, { detail: empty() })
    api.delete.mockRejectedValue(new ApiError(409, "La localización '300002' figura en movimientos y no se puede retirar"))
    const wrapper = await open()

    await wrapper.find('[data-test="remove-location"]').trigger('click')
    await wrapper.find('[data-test="confirm-removal"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="remove-error"]').text()).toContain('movimientos')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('cancelar la retirada no borra nada', async () => {
    serveLocation(api, { detail: empty() })
    const wrapper = await open()

    await wrapper.find('[data-test="remove-location"]').trigger('click')
    const cancel = wrapper.find('[data-test="remove-dialog"]').findAll('button').find((button) => button.text() === 'Cancelar')!
    await cancel.trigger('click')

    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="remove-dialog"]').exists()).toBe(false)
  })
})
