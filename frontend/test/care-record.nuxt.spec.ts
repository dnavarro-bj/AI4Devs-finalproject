import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble } from './helpers/apiDouble'
import { careRecord, speciesCare } from './helpers/fixtures'
import CareRecordForm from '@features/care-records/components/CareRecordForm.vue'
import { ApiError } from '@shared/services/httpClient'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

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

  /** `now` entra por parámetro para que el formulario sea determinista, como la agenda. */
  const NOW = '2026-09-06T09:40:00.000Z'

  it('registra solo los valores informados, con la fecha propuesta', async () => {
    api.post.mockResolvedValue(careRecord())
    const wrapper = await mountSuspended(CareRecordForm, {
      props: { plantId, now: NOW },
    })

    await wrapper.find('[data-test="humidity"]').setValue('8')
    await wrapper.find('[data-test="temperature"]').setValue('22')
    await wrapper.find('[data-test="generate-ai"]').setValue(false)
    await wrapper.find('form').trigger('submit')
    await settle()

    const body = api.post.mock.calls[0]![1] as Record<string, unknown>
    expect(body).toMatchObject({ humidity: 8, temperature: 22 })
    // Un campo vacío se omite: `null` y `0` significan cosas distintas en el riego.
    expect(body).not.toHaveProperty('waterAmountMl')
  })

  /**
   * La requirement cambió con `esqueleto-plantas`: una lectura se anota a menudo después de
   * haberla tomado (§13.4), así que la fecha se pide, propuesta como ahora y corregible.
   */
  it('propone la fecha actual y no admite una futura', async () => {
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId, now: NOW } })

    const field = wrapper.find('[data-test="recorded-at"]')
    expect((field.element as HTMLInputElement).value).toBe('2026-09-06T09:40')
    expect(field.attributes('max')).toBe('2026-09-06T09:40')
  })

  it('muestra el rango efectivo de la planta junto a cada magnitud', async () => {
    const wrapper = await mountSuspended(CareRecordForm, {
      props: { plantId, now: NOW, species: speciesCare() },
    })

    expect(wrapper.text()).toContain('Recomendada 10–30 %')
    expect(wrapper.text()).toContain('Recomendada 10–35 °C')
  })

  it('sin los rangos de la especie el formulario sigue sirviendo', async () => {
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId, now: NOW } })

    expect(wrapper.find('[data-test="humidity"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Recomendada')
  })

  it('dice cuántos valores va a guardar, y que nada se guarda hasta confirmar', async () => {
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId, now: NOW } })

    expect(wrapper.find('[data-test="ready-count"]').text()).toContain('0 valores')

    await wrapper.find('[data-test="humidity"]').setValue('8')
    expect(wrapper.find('[data-test="ready-count"]').text()).toContain('1 valor')
    expect(wrapper.find('[data-test="ready-count"]').text()).toContain('hasta confirmar')
  })

  it('pide el análisis al guardar solo si se ha marcado', async () => {
    api.post.mockResolvedValue(careRecord())
    const wrapper = await mountSuspended(CareRecordForm, { props: { plantId, now: NOW } })

    await wrapper.find('[data-test="humidity"]').setValue('8')
    await wrapper.find('form').trigger('submit')
    await settle()

    // Dos peticiones: la lectura y su análisis, en ese orden.
    expect(api.post).toHaveBeenCalledTimes(2)
    expect(api.post.mock.calls[1]![0]).toContain('/recommendation')
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
