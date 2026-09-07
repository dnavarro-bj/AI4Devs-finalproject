import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesDetail from '../app/pages/species/[id]/index.vue'
import type { SpeciesCare } from '@features/species/types/species.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '200001' } }))

/**
 * Escenarios de la requirement «Retirada de una especie».
 *
 * Retirar es irreversible y afecta a un catálogo compartido, así que se confirma; y el `409` de
 * una especie con ejemplares se explica por su causa, no como un fallo inesperado.
 */
describe('retirada de una especie', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
  })

  const care: SpeciesCare = {
    id: '200001',
    scientificName: 'Echinocactus grusonii',
    commonName: 'Asiento de suegra',
    minHumidity: 10,
    maxHumidity: 30,
    minTemperature: 10,
    maxTemperature: 35,
    minLightHours: 6,
    maxLightHours: 10,
    wateringGuideline: 'cada 10-20 dias',
    soilMix: { id: '100001', name: 'Sustrato mineral de drenaje rápido' },
  }

  const openDialog = async () => {
    api.get.mockResolvedValue(care)
    const wrapper = await mountSuspended(SpeciesDetail)
    await settle()
    await wrapper.find('[data-test="remove-species"]').trigger('click')
    return wrapper
  }

  it('pide confirmación antes de retirar: no se retira de un solo clic', async () => {
    const wrapper = await openDialog()

    expect(wrapper.find('[data-test="remove-dialog"]').exists()).toBe(true)
    expect(api.delete).not.toHaveBeenCalled()
  })

  it('la confirmación nombra la especie que se va a retirar', async () => {
    const wrapper = await openDialog()

    expect(wrapper.find('[data-test="remove-dialog"]').text()).toContain('Echinocactus grusonii')
  })

  it('confirmada, retira la especie', async () => {
    api.delete.mockResolvedValue(undefined)

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(api.delete).toHaveBeenCalledWith('/species/200001')
  })

  it('cancelada, no retira nada y la ficha queda como estaba', async () => {
    const wrapper = await openDialog()
    await wrapper.find('[data-test="cancel-remove"]').trigger('click')

    expect(api.delete).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="remove-dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Echinocactus grusonii')
  })

  it('una especie con ejemplares explica esa causa concreta, no un fallo inesperado', async () => {
    api.delete.mockRejectedValue(
      new ApiError(409, "La especie '200001' tiene ejemplares registrados y no se puede eliminar"),
    )

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    const message = wrapper.find('[data-test="remove-error"]').text()
    expect(message).toContain('ejemplares registrados')
    expect(message).not.toContain('409')
  })

  it('tras el 409 la especie sigue en la ficha, no desaparece de la pantalla', async () => {
    api.delete.mockRejectedValue(new ApiError(409, 'La especie tiene ejemplares registrados'))

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Echinocactus grusonii')
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(false)
  })

  /** El mensaje del API se prefiere al propio: lo escribe quien conoce la regla. */
  it('cae a un mensaje propio solo cuando el API no trae ninguno', async () => {
    api.delete.mockRejectedValue(new ApiError(409, ''))

    const wrapper = await openDialog()
    await wrapper.find('[data-test="confirm-remove"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="remove-error"]').text()).toContain('ejemplares')
  })
})
