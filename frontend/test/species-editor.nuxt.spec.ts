import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import SpeciesForm from '@features/species/components/SpeciesForm.vue'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Alta y edición de una especie».
 *
 * Se prueba el formulario compartido, que es donde vive la validación: las dos rutas que lo montan
 * solo aportan de dónde salen los valores iniciales y a dónde se va al guardar.
 */
describe('editor de una especie', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    api.put.mockReset()
    api.delete.mockReset()
    // El selector de mezclas es real desde `catalogo-sustratos`.
    api.get.mockResolvedValue({
      content: [
        { id: '100001', name: 'Sustrato mineral de drenaje rápido', organicPercentage: 20, mineralPercentage: 80, phMin: 5.5, phMax: 6.5, description: null },
        { id: '100002', name: 'Sustrato equilibrado', organicPercentage: 40, mineralPercentage: 60, phMin: 6, phMax: 7, description: null },
      ],
      totalElements: 2,
      totalPages: 1,
      pageNumber: 0,
      pageSize: 25,
    })
  })

  const VALID = {
    scientificName: 'Echinocactus grusonii',
    commonName: 'Asiento de suegra',
    'min-humidity': '10',
    'max-humidity': '30',
    'min-temperature': '10',
    'max-temperature': '35',
    'min-light': '6',
    'max-light': '10',
    watering: 'cada 10-20 dias',
  }

  const fill = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>, values: Record<string, string>) => {
    for (const [test, value] of Object.entries(values)) {
      // `data-test` cae en el **control**: `UiField` no hereda los atributos en su envoltorio.
      await wrapper.find(`[data-test="${test}"]`).setValue(value)
    }
  }

  const mountForm = async (props: Record<string, unknown> = {}) => {
    const wrapper = await mountSuspended(SpeciesForm, { props })
    await settle()
    return wrapper
  }

  it('envía la ficha completa, con la mezcla por identificador', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { ...VALID, 'soil-mix': '100001' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      scientificName: 'Echinocactus grusonii',
      commonName: 'Asiento de suegra',
      minHumidity: 10,
      maxHumidity: 30,
      minTemperature: 10,
      maxTemperature: 35,
      minLightHours: 6,
      maxLightHours: 10,
      wateringGuideline: 'cada 10-20 dias',
      soilMixId: '100001',
    })
  })

  /** Comprobación de rango, permitida en el borde: evita un viaje para algo que se sabe sin preguntar. */
  it('un rango invertido se señala en ese rango y no se envía', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { ...VALID, 'soil-mix': '100001', 'min-humidity': '80', 'max-humidity': '20' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="humidity-error"]').text()).toContain('no puede superar')
  })

  it('señala el rango invertido de temperatura sin confundirlo con el de humedad', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { ...VALID, 'soil-mix': '100001', 'min-temperature': '40', 'max-temperature': '10' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.find('[data-test="temperature-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(false)
  })

  it('exige el nombre científico, señalándolo en su campo', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { ...VALID, 'soil-mix': '100001', scientificName: '   ' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="scientific-name-error"]').exists()).toBe(true)
  })

  it('exige elegir una mezcla de sustrato: el API la pide obligatoriamente', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, VALID)
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="soil-mix-error"]').exists()).toBe(true)
  })

  it('el selector de mezclas se puebla del catálogo, que es dato real', async () => {
    const wrapper = await mountForm()

    const options = wrapper.findAll('[data-test="soil-mix"] option')
    expect(options.map((option) => option.text())).toContain('Sustrato mineral de drenaje rápido')
  })

  it('la edición llega prellenada con lo que la especie tenía, mezcla incluida', async () => {
    const wrapper = await mountForm({
      initial: {
        scientificName: 'Mammillaria elongata',
        commonName: 'Cactus dedo de dama',
        minHumidity: 15,
        maxHumidity: 40,
        minTemperature: 12,
        maxTemperature: 32,
        minLightHours: 5,
        maxLightHours: 9,
        wateringGuideline: 'cada 7-14 dias',
        soilMixId: '100002',
      },
    })

    expect((wrapper.find('[data-test="scientificName"]').element as HTMLInputElement).value)
      .toBe('Mammillaria elongata')
    expect((wrapper.find('[data-test="soil-mix"]').element as HTMLSelectElement).value).toBe('100002')
  })

  /**
   * El escenario que motivó adelantar `catalogo-sustratos`: el `PUT` es reemplazo completo, así
   * que guardar sin tocar la mezcla no puede cambiarla.
   */
  it('corregir sin tocar la mezcla la conserva, no la cambia por otra', async () => {
    const wrapper = await mountForm({
      initial: {
        scientificName: 'Mammillaria elongata',
        commonName: 'Cactus dedo de dama',
        minHumidity: 15,
        maxHumidity: 40,
        minTemperature: 12,
        maxTemperature: 32,
        minLightHours: 5,
        maxLightHours: 9,
        wateringGuideline: 'cada 7-14 dias',
        soilMixId: '100002',
      },
    })

    await fill(wrapper, { commonName: 'Dedo de dama' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    const sent = wrapper.emitted('submit')?.[0]?.[0] as { soilMixId: string, commonName: string }
    expect(sent.commonName).toBe('Dedo de dama')
    expect(sent.soilMixId).toBe('100002')
  })

  /** Un error general en un formulario de cuatro secciones obliga a buscar cuál falla. */
  it('el nombre científico ya registrado se señala junto a ese campo, conservando lo introducido', async () => {
    const wrapper = await mountForm({
      submitError: { field: 'scientificName', message: "Ya existe una especie con el nombre científico 'Echinocactus grusonii'" },
    })

    expect(wrapper.find('[data-test="scientific-name-error"]').text()).toContain('Ya existe')
  })

  it('un error que no es de un campo concreto se muestra en la cabecera del formulario', async () => {
    const wrapper = await mountForm({
      submitError: { field: null, message: 'No se ha podido completar la operación.' },
    })

    expect(wrapper.find('[data-test="submit-error"]').text()).toContain('No se ha podido')
  })

  it('un fallo al cargar el catálogo de mezclas se dice, sin dejar el selector mudo', async () => {
    const { ApiError } = await import('@shared/services/httpClient')
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido cargar el catálogo.'))

    const wrapper = await mountForm()

    expect(wrapper.find('[data-test="catalogs-error"]').exists()).toBe(true)
  })
})
