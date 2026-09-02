import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble } from './helpers/apiDouble'
import { careRecord } from './helpers/fixtures'
import CareRecordForm from '../app/components/CareRecordForm.vue'
import { ApiError } from '../app/types/api'

const api = createApiDouble()
mockNuxtImport('useApi', () => () => api)

const plantId = '882687672222443468'

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Escenarios "Lectura registrada", "Lectura sin ningún valor" y "Valor fuera del rango admitido". */
describe('registro de una lectura de cultivo', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
  })

  it('registra la lectura con solo los valores informados y sin pedir la fecha', async () => {
    api.post.mockResolvedValue(careRecord())
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId } })

    await wrapper.find('[data-test="humidity"]').setValue('8')
    await wrapper.find('[data-test="temperature"]').setValue('22')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith(`/plants/${plantId}/care-records`, {
      humidity: 8,
      temperature: 22,
    })
    // La fecha la sella el servidor: el formulario no la pide ni la envía.
    expect(wrapper.find('[data-test="recordedAt"]').exists()).toBe(false)
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('recordedAt')
  })

  it('exige al menos un valor y no registra nada', async () => {
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId } })

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="error"]').text().toLowerCase()).toContain('al menos un valor')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('pinta el error del API y conserva lo introducido', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'La humedad debe estar entre 0 y 100'))
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId } })

    await wrapper.find('[data-test="humidity"]').setValue('150')
    await wrapper.find('[data-test="temperature"]').setValue('22')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('La humedad debe estar entre 0 y 100')
    expect((wrapper.find('[data-test="humidity"]').element as HTMLInputElement).value).toBe('150')
    expect((wrapper.find('[data-test="temperature"]').element as HTMLInputElement).value).toBe('22')
  })

  it('emite la lectura registrada para que la ficha la refleje sin recarga', async () => {
    const registered = careRecord()
    api.post.mockResolvedValue(registered)
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId } })

    await wrapper.find('[data-test="humidity"]').setValue('8')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.emitted('registered')?.[0]).toEqual([registered])
  })
})
