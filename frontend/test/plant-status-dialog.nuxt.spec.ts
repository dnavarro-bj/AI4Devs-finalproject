import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail } from './helpers/fixtures'
import PlantStatusDialog from '../src/features/plants/components/PlantStatusDialog.vue'
import type { PlantStatus } from '../src/features/plants/types/plant.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios «Cambiar el estado», «Solo las transiciones válidas» y «Cambio rechazado por el API» de
 * «Perfil real del ejemplar en las pantallas».
 */
describe('diálogo de cambio de estado', () => {
  beforeEach(() => {
    api.put.mockReset()
  })

  const open = async (status: PlantStatus) => {
    const wrapper = await mountSuspended(PlantStatusDialog, {
      props: { open: true, plant: { ...plantDetail(), status } },
    })
    await settle()
    return wrapper
  }

  const options = (wrapper: Awaited<ReturnType<typeof open>>) =>
    wrapper.findAll('[data-test="new-status"] option').map((option) => option.attributes('value')).filter(Boolean)

  it('desde un estado en curso ofrece todos los demás', async () => {
    const wrapper = await open('activa')

    expect(options(wrapper)).toEqual(['cuarentena', 'enferma', 'cedida', 'vendida', 'muerta', 'perdida'])
  })

  it('desde un estado final solo ofrece volver a activa', async () => {
    const wrapper = await open('muerta')

    expect(options(wrapper)).toEqual(['activa'])
  })

  it('nunca ofrece el estado actual', async () => {
    const wrapper = await open('enferma')

    expect(options(wrapper)).not.toContain('enferma')
  })

  it('cambia el estado con su motivo, avisa a la ficha y no envía lo que no toca', async () => {
    api.put.mockResolvedValue({ ...plantDetail(), status: 'vendida' })
    const wrapper = await open('activa')

    await wrapper.find('[data-test="new-status"]').setValue('vendida')
    await wrapper.find('[data-test="status-reason"]').setValue('Vendida a un coleccionista')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468/status', {
      status: 'vendida', reason: 'Vendida a un coleccionista',
    })
    expect(wrapper.emitted('changed')?.[0]?.[0]).toMatchObject({ status: 'vendida' })
  })

  it('el motivo es opcional entre estados en curso', async () => {
    api.put.mockResolvedValue({ ...plantDetail(), status: 'enferma' })
    const wrapper = await open('activa')

    await wrapper.find('[data-test="new-status"]').setValue('enferma')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468/status', { status: 'enferma' })
  })

  it('volver a activa desde un estado final exige motivo: sin él no se envía', async () => {
    const wrapper = await open('muerta')

    expect(wrapper.find('[data-test="reason-required"]').exists()).toBe(true)
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="reason-error"]').text()).toContain('motivo')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('con el motivo la corrección se envía', async () => {
    api.put.mockResolvedValue({ ...plantDetail(), status: 'activa' })
    const wrapper = await open('muerta')

    await wrapper.find('[data-test="status-reason"]').setValue('Era un error al marcarla')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(api.put).toHaveBeenCalledWith('/plants/882687672222443468/status', {
      status: 'activa', reason: 'Era un error al marcarla',
    })
  })

  it('si el API rechaza el cambio, explica el motivo y no pierde lo escrito', async () => {
    api.put.mockRejectedValue(new ApiError(409, "Desde el estado 'muerta' solo se puede volver a 'activa'"))
    const wrapper = await open('activa')

    await wrapper.find('[data-test="new-status"]').setValue('muerta')
    await wrapper.find('[data-test="status-reason"]').setValue('Se secó')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="status-error"]').text()).toContain('solo se puede volver')
    expect(wrapper.emitted('changed')).toBeUndefined()
    expect((wrapper.find('[data-test="status-reason"]').element as HTMLTextAreaElement).value).toBe('Se secó')
  })

  it('cerrar el diálogo lo comunica', async () => {
    const wrapper = await open('activa')

    await wrapper.find('[data-test="cancel-status"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
