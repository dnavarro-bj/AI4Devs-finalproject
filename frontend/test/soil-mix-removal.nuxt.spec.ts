import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SoilMixDetail from '../app/pages/soil-mixes/[id]/index.vue'
import type { SoilMixDetail as Detail } from '@features/soil-mixes/types/soilMix.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '100001' } }))

/**
 * Escenarios de la requirement «Retirada de una mezcla».
 *
 * Retirar es irreversible y afecta a un catálogo compartido, así que se confirma; y el `409` se
 * explica por lo que significa, no como un fallo inesperado.
 */
describe('retirada de una mezcla', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const detail = (speciesCount: number): Detail => ({
    id: '100001',
    name: 'Sustrato mineral de drenaje rápido',
    organicPercentage: 20,
    mineralPercentage: 80,
    phMin: 5.5,
    phMax: 6.5,
    description: 'akadama, pómez, turba',
    speciesCount,
  })

  const openDialog = async () => {
    const wrapper = await mountSuspended(SoilMixDetail)
    await settle()
    await wrapper.find('[data-test="remove-soil-mix"]').trigger('click')
    return wrapper
  }

  it('pide confirmación antes de retirar: no se retira de un solo clic', async () => {
    api.get.mockResolvedValue(detail(0))

    const wrapper = await openDialog()

    expect(wrapper.find('[data-test="remove-dialog"]').exists()).toBe(true)
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('confirmada, retira la mezcla', async () => {
    api.get.mockResolvedValue(detail(0))
    api.delete.mockResolvedValue(undefined)

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/soil-mixes/100001')
  })

  it('cancelada, no retira nada y la ficha queda como estaba', async () => {
    api.get.mockResolvedValue(detail(0))

    const wrapper = await openDialog()
    await wrapper.find('[data-test="remove-dialog"] [data-test="cancel-remove"]').trigger('click')

    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="remove-dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sustrato mineral de drenaje rápido')
  })

  /** La confirmación declara el alcance: cuántas especies la recomiendan, con la cifra exacta. */
  it('una mezcla en uso declara a cuántas especies afecta antes de confirmar', async () => {
    api.get.mockResolvedValue(detail(3))

    const wrapper = await openDialog()

    expect(wrapper.find('[data-test="remove-dialog"]').text()).toContain('3')
  })

  it('el 409 se explica por su causa concreta, no como fallo inesperado', async () => {
    api.get.mockResolvedValue(detail(3))
    api.delete.mockRejectedValue(
      new ApiError(409, "La mezcla de tierra '100001' la recomienda alguna especie y no se puede eliminar"),
    )

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    const message = wrapper.find('[data-test="remove-error"]').text()
    expect(message).toContain('no se puede eliminar')
    expect(message).not.toContain('409')
  })

  it('tras un 409 la mezcla sigue en la ficha, no desaparece de la pantalla', async () => {
    api.get.mockResolvedValue(detail(3))
    api.delete.mockRejectedValue(new ApiError(409, 'La mezcla está en uso'))

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Sustrato mineral de drenaje rápido')
  })
})
