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
    code: 'CAT-GRUSS',
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

  it('agrupa cada pareja de límites como en el wireframe', async () => {
    const wrapper = await mountForm()
    const ranges = wrapper.findAll('[data-test$="-range"]')

    expect(ranges).toHaveLength(3)
    expect(ranges.map((range) => range.find('legend').text())).toEqual([
      'Temperatura recomendada',
      'Humedad recomendada',
      'Horas de luz',
    ])
    expect(ranges.every((range) => range.findAll('input').length === 2)).toBe(true)
  })

  it('envía la ficha completa, con la mezcla por identificador', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { ...VALID, 'soil-mix': '100001' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      code: 'CAT-GRUSS',
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
      description: null,
      sunExposure: null,
      environment: null,
      bloomDescription: null,
      bloomColor: null,
      bloomMaturity: null,
      bloomTypicalDuration: null,
      periods: [],
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

  it('mantiene en el editor la sección de fotografías del wireframe, marcada con T-19', async () => {
    const wrapper = await mountForm()

    const photos = wrapper.find('[data-test="species-photos"]')
    expect(photos.exists()).toBe(true)
    expect(photos.text()).toContain('T-19')
    expect(photos.find('[data-test="species-photo-upload"]').exists()).toBe(true)
  })

  describe('ficha de cultivo y calendario (T-17)', () => {
    const submit = async (wrapper: Awaited<ReturnType<typeof mountForm>>) => {
      await fill(wrapper, { ...VALID, 'soil-mix': '100001' })
      await wrapper.find('[data-test="species-form"]').trigger('submit')
      return wrapper.emitted('submit')?.[0]?.[0] as Record<string, unknown> | undefined
    }

    /** Pulsa el mes `month` (1–12) de una pauta de la rejilla, `times` veces. */
    const press = async (wrapper: Awaited<ReturnType<typeof mountForm>>, row: number, month: number, times = 1) => {
      const cell = wrapper.findAll('[data-test="species-year-grid"] [data-role="year-row"]')[row]!
        .findAll('[data-role="month"]')[month - 1]!
      for (let i = 0; i < times; i++) await cell.find('button').trigger('click')
    }

    const ROW = { growth: 0, rest: 1, flowering: 2, watering: 3 }

    it('cada exposición muestra su definición y ninguna pide horas', async () => {
      const wrapper = await mountForm()

      const exposure = wrapper.find('[data-test="species-exposure"]')
      for (const label of ['Sombra', 'Semisombra', 'Soleado', 'Pleno sol']) expect(exposure.text()).toContain(label)
      expect(exposure.text()).toContain('Varias horas de sol directo')
      expect(exposure.text()).toContain('Exposición directa prolongada')
      expect(exposure.text()).not.toMatch(/\d/)
    })

    it('el entorno ofrece interior, exterior y ambos, y no «estacional»', async () => {
      const wrapper = await mountForm()

      const environment = wrapper.find('[data-test="species-environment"]')
      expect(environment.findAll('input[type="radio"]')).toHaveLength(3)
      expect(environment.text()).toContain('Interior')
      expect(environment.text()).toContain('Exterior')
      expect(environment.text()).toContain('Ambos')
      expect(environment.text()).not.toContain('Estacional')
    })

    it('la sección de crecimiento y floración ya no es una maqueta: una rejilla pulsable de cuatro pautas', async () => {
      const wrapper = await mountForm()

      const seasons = wrapper.find('[data-test="species-seasons"]')
      expect(seasons.attributes('data-mock')).toBeUndefined()
      expect(seasons.text()).not.toContain('T-17')
      expect(seasons.findAll('[data-role="month-head"]')).toHaveLength(12)
      expect(seasons.findAll('[data-role="year-row"]')).toHaveLength(4)
      expect(seasons.findAll('[data-role="month"] button')).toHaveLength(48)
      expect(seasons.find('select[data-test="period-type"]').exists()).toBe(false)
    })

    it('envía la exposición, el entorno, la descripción y la floración', async () => {
      const wrapper = await mountForm()
      await wrapper.find('[data-test="species-exposure"] input[value="pleno_sol"]').setValue(true)
      await wrapper.find('[data-test="species-environment"] input[value="exterior"]').setValue(true)
      await fill(wrapper, {
        description: 'Cactus globular',
        'bloom-color': 'Amarillo intenso',
        'bloom-maturity': '15-20 años',
        'bloom-duration': '3-5 días',
        'bloom-notes': 'Mejora tras un reposo seco',
      })

      const body = await submit(wrapper)

      expect(body).toMatchObject({
        description: 'Cactus globular',
        sunExposure: 'pleno_sol',
        environment: 'exterior',
        bloomColor: 'Amarillo intenso',
        bloomMaturity: '15-20 años',
        bloomTypicalDuration: '3-5 días',
        bloomDescription: 'Mejora tras un reposo seco',
      })
    })

    it('pulsar un mes de floración lo marca, y otra vez lo quita', async () => {
      const wrapper = await mountForm()

      await press(wrapper, ROW.flowering, 5)
      await press(wrapper, ROW.flowering, 6)
      await press(wrapper, ROW.flowering, 7)
      expect((await submit(wrapper))!.periods).toEqual([
        { type: 'floracion', startMonth: 5, endMonth: 7, intensity: null, notes: null },
      ])

      await press(wrapper, ROW.flowering, 6)
      wrapper.emitted('submit')!.length = 0
      expect((await submit(wrapper))!.periods).toEqual([
        { type: 'floracion', startMonth: 5, endMonth: 5, intensity: null, notes: null },
        { type: 'floracion', startMonth: 7, endMonth: 7, intensity: null, notes: null },
      ])
    })

    it('la segunda pulsación del crecimiento marca el crecimiento máximo, dentro del crecimiento', async () => {
      const wrapper = await mountForm()

      for (const month of [3, 4, 5, 6]) await press(wrapper, ROW.growth, month)
      await press(wrapper, ROW.growth, 4, 1)
      await press(wrapper, ROW.growth, 5, 1)

      const cells = wrapper.findAll('[data-test="species-year-grid"] [data-role="year-row"]')[ROW.growth]!
        .findAll('[data-role="month"]').map((cell) => cell.attributes('data-level'))
      expect(cells.slice(2, 6)).toEqual(['1', '2', '2', '1'])

      expect((await submit(wrapper))!.periods).toEqual([
        { type: 'crecimiento', startMonth: 3, endMonth: 6, intensity: null, notes: null },
        { type: 'crecimiento_maximo', startMonth: 4, endMonth: 5, intensity: null, notes: null },
      ])
    })

    it('una tercera pulsación del crecimiento lo quita del todo, también del máximo', async () => {
      const wrapper = await mountForm()

      await press(wrapper, ROW.growth, 6, 3)

      expect((await submit(wrapper))!.periods).toEqual([])
    })

    it('el riego sube de escaso a abundante con cada pulsación', async () => {
      const wrapper = await mountForm()

      await press(wrapper, ROW.watering, 3, 1)
      await press(wrapper, ROW.watering, 4, 2)
      await press(wrapper, ROW.watering, 5, 3)

      const levels = wrapper.findAll('[data-test="species-year-grid"] [data-role="year-row"]')[ROW.watering]!
        .findAll('[data-role="month"]').map((cell) => cell.attributes('data-level'))
      expect(levels.slice(2, 5)).toEqual(['1', '2', '3'])
      expect((await submit(wrapper))!.periods).toEqual([
        { type: 'riego', startMonth: 3, endMonth: 3, intensity: 'escaso', notes: null },
        { type: 'riego', startMonth: 4, endMonth: 4, intensity: 'moderado', notes: null },
        { type: 'riego', startMonth: 5, endMonth: 5, intensity: 'abundante', notes: null },
      ])
    })

    it('diciembre y enero marcados seguidos se envían como un solo reposo que cruza el año', async () => {
      const wrapper = await mountForm()

      for (const month of [11, 12, 1, 2]) await press(wrapper, ROW.rest, month)

      expect((await submit(wrapper))!.periods).toEqual([
        { type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: null },
      ])
    })

    it('explica cómo se usa la rejilla', async () => {
      const wrapper = await mountForm()

      expect(wrapper.find('[data-test="year-help"]').text()).toContain('vuelve a pulsarlo')
    })

    it('la edición precarga la ficha de cultivo y el calendario', async () => {
      const wrapper = await mountForm({
        initial: {
          code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra',
          minHumidity: 10, maxHumidity: 30, minTemperature: 10, maxTemperature: 35, minLightHours: 6, maxLightHours: 10,
          wateringGuideline: 'cada 10-20 dias', soilMixId: '100001',
          description: 'Cactus globular', sunExposure: 'soleado', environment: 'ambos', bloomColor: 'Amarillo',
          periods: [{ type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: 'seco' }],
        },
        plantCount: 1,
      })

      expect((wrapper.find('[data-test="species-exposure"] input[value="soleado"]').element as HTMLInputElement).checked).toBe(true)
      expect((wrapper.find('[data-test="species-environment"] input[value="ambos"]').element as HTMLInputElement).checked).toBe(true)
      expect((wrapper.find('[data-test="description"]').element as HTMLTextAreaElement).value).toBe('Cactus globular')
      expect((wrapper.find('[data-test="bloom-color"]').element as HTMLInputElement).value).toBe('Amarillo')
      const rest = wrapper.findAll('[data-test="species-year-grid"] [data-role="year-row"]')[ROW.rest]!
        .findAll('[data-role="month"]').map((cell) => cell.attributes('data-level'))
      expect(rest).toEqual(['1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'])

      await wrapper.find('[data-test="species-form"]').trigger('submit')
      expect((wrapper.emitted('submit')?.[0]?.[0] as { periods: unknown[] }).periods).toEqual([
        { type: 'reposo', startMonth: 11, endMonth: 2, intensity: null, notes: null },
      ])
    })
  })

  it('la edición llega prellenada con lo que la especie tenía, mezcla incluida', async () => {
    const wrapper = await mountForm({
      initial: {
        code: 'CAT-MAMMI',
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
        code: 'CAT-MAMMI',
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

  // --- Código de la especie (codigos-de-inventario) ---

  it('el código es obligatorio: sin él no se envía y se señala su campo', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { ...VALID, 'soil-mix': '100001' })
    // El usuario borra la propuesta: el campo es obligatorio y no se envía en blanco.
    await wrapper.find('[data-test="code"]').setValue('   ')
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="code-error"]').text()).toContain('obligatorio')
  })

  it('el campo explica qué es el código y da un ejemplo de formato', async () => {
    const wrapper = await mountForm()

    const help = wrapper.find('[data-test="code"]').attributes('aria-describedby')
    expect(help).toBeTruthy()
    expect(wrapper.text()).toContain('CAT-GRUSS')
  })

  it('la edición llega con el código actual', async () => {
    const wrapper = await mountForm({
      initial: {
        code: 'CAT-MAMMI',
        scientificName: 'Mammillaria elongata',
        commonName: 'Cactus dedo de dama',
        minHumidity: 15, maxHumidity: 40, minTemperature: 12, maxTemperature: 32,
        minLightHours: 5, maxLightHours: 9, wateringGuideline: 'cada 7-14 dias', soilMixId: '100002',
      },
    })

    expect((wrapper.find('[data-test="code"]').element as HTMLInputElement).value).toBe('CAT-MAMMI')
  })

  it('con ejemplares el código está deshabilitado y explica por qué', async () => {
    const wrapper = await mountForm({
      plantCount: 3,
      initial: {
        code: 'CAT-MAMMI',
        scientificName: 'Mammillaria elongata',
        commonName: 'Cactus dedo de dama',
        minHumidity: 15, maxHumidity: 40, minTemperature: 12, maxTemperature: 32,
        minLightHours: 5, maxLightHours: 9, wateringGuideline: 'cada 7-14 dias', soilMixId: '100002',
      },
    })

    expect(wrapper.find('[data-test="code"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="code-locked"]').text()).toContain('3 ejemplares')
  })

  it('con el código bloqueado el resto de la ficha se sigue enviando, con su mismo código', async () => {
    const wrapper = await mountForm({
      plantCount: 2,
      initial: {
        code: 'CAT-MAMMI',
        scientificName: 'Mammillaria elongata',
        commonName: 'Cactus dedo de dama',
        minHumidity: 15, maxHumidity: 40, minTemperature: 12, maxTemperature: 32,
        minLightHours: 5, maxLightHours: 9, wateringGuideline: 'cada 7-14 dias', soilMixId: '100002',
      },
    })

    await fill(wrapper, { commonName: 'Dedo de dama' })
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    const sent = wrapper.emitted('submit')?.[0]?.[0] as { code: string, commonName: string }
    expect(sent.code).toBe('CAT-MAMMI')
    expect(sent.commonName).toBe('Dedo de dama')
  })

  it('un código ya usado se señala junto a su campo, conservando lo introducido', async () => {
    const wrapper = await mountForm({
      submitError: { field: 'code', message: "Ya existe una especie con el código 'CAT-GRUSS'" },
    })

    expect(wrapper.find('[data-test="code-error"]').text()).toContain('Ya existe')
    expect(wrapper.find('[data-test="scientific-name-error"]').exists()).toBe(false)
  })

  // --- Propuesta del código en el formulario ---

  const codeOf = (wrapper: Awaited<ReturnType<typeof mountForm>>) =>
    (wrapper.find('[data-test="code"]').element as HTMLInputElement).value

  it('en el alta propone el código a medida que se escribe el nombre científico', async () => {
    const wrapper = await mountForm()
    expect(codeOf(wrapper)).toBe('')

    await wrapper.find('[data-test="scientificName"]').setValue('Echinocactus grusonii')

    expect(codeOf(wrapper)).toBe('CAT-ECHIN')
    expect(wrapper.find('[data-test="code-suggested"]').exists()).toBe(true)
  })

  it('la propuesta sigue al nombre mientras el usuario no toque el código', async () => {
    const wrapper = await mountForm()

    await wrapper.find('[data-test="scientificName"]').setValue('Echinocactus grusonii')
    await wrapper.find('[data-test="scientificName"]').setValue('Mammillaria elongata')

    expect(codeOf(wrapper)).toBe('CAT-MAMMI')
  })

  it('un código escrito a mano ya no lo pisa la propuesta', async () => {
    const wrapper = await mountForm()
    await wrapper.find('[data-test="scientificName"]').setValue('Echinocactus grusonii')

    await wrapper.find('[data-test="code"]').setValue('CAT-GRUSS')
    await wrapper.find('[data-test="scientificName"]').setValue('Mammillaria elongata')

    expect(codeOf(wrapper)).toBe('CAT-GRUSS')
    expect(wrapper.find('[data-test="code-suggested"]').exists()).toBe(false)
  })

  it('vaciar el código devuelve el control a la propuesta', async () => {
    const wrapper = await mountForm()
    await wrapper.find('[data-test="code"]').setValue('CAT-GRUSS')

    await wrapper.find('[data-test="code"]').setValue('')
    await wrapper.find('[data-test="scientificName"]').setValue('Mammillaria elongata')

    expect(codeOf(wrapper)).toBe('CAT-MAMMI')
  })

  it('el código propuesto es el que se envía al guardar, y se puede corregir antes', async () => {
    const wrapper = await mountForm()
    await fill(wrapper, { ...Object.fromEntries(Object.entries(VALID).filter(([key]) => key !== 'code')), 'soil-mix': '100001' })

    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect((wrapper.emitted('submit')?.[0]?.[0] as { code: string }).code).toBe('CAT-ECHIN')
  })

  it('en la edición el cambio de nombre no toca el código existente', async () => {
    const wrapper = await mountForm({
      initial: {
        code: 'CAT-MAMMI',
        scientificName: 'Mammillaria elongata',
        commonName: 'Cactus dedo de dama',
        minHumidity: 15, maxHumidity: 40, minTemperature: 12, maxTemperature: 32,
        minLightHours: 5, maxLightHours: 9, wateringGuideline: 'cada 7-14 dias', soilMixId: '100002',
      },
    })

    await wrapper.find('[data-test="scientificName"]').setValue('Mammillaria bocasana')

    expect(codeOf(wrapper)).toBe('CAT-MAMMI')
    expect(wrapper.find('[data-test="code-suggested"]').exists()).toBe(false)
  })

  // --- Validadores de los rangos (escala y número entero) ---

  const submitWith = async (overrides: Record<string, string>) => {
    const wrapper = await mountForm()
    await fill(wrapper, { ...VALID, 'soil-mix': '100001', ...overrides })
    await wrapper.find('[data-test="species-form"]').trigger('submit')
    return wrapper
  }

  it('una humedad fuera de 0 a 100 se señala en su rango y no se envía', async () => {
    const wrapper = await submitWith({ 'max-humidity': '150' })

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="humidity-error"]').text()).toContain('entre 0 y 100')
  })

  it('una humedad negativa también se rechaza', async () => {
    const wrapper = await submitWith({ 'min-humidity': '-5' })

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(true)
  })

  it('unas horas de luz fuera de 0 a 24 se señalan en su rango', async () => {
    const wrapper = await submitWith({ 'max-light': '30' })

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="light-error"]').text()).toContain('entre 0 y 24')
  })

  it('una temperatura implausible se señala en su rango', async () => {
    const wrapper = await submitWith({ 'max-temperature': '500' })

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="temperature-error"]').text()).toContain('temperatura')
  })

  it('vaciar un extremo no lo convierte en un cero silencioso: se pide', async () => {
    const wrapper = await submitWith({ 'min-humidity': '' })

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="humidity-error"]').text()).toContain('Indica el mínimo y el máximo')
  })

  it('un decimal se rechaza: el API guarda enteros', async () => {
    const wrapper = await submitWith({ 'min-temperature': '10.5' })

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[data-test="temperature-error"]').text()).toContain('número entero')
  })

  it('los tres rangos inválidos a la vez se señalan cada uno en el suyo', async () => {
    const wrapper = await submitWith({ 'max-humidity': '150', 'max-temperature': '500', 'max-light': '30' })

    for (const error of ['humidity-error', 'temperature-error', 'light-error']) {
      expect(wrapper.find(`[data-test="${error}"]`).exists(), error).toBe(true)
    }
  })

  it('los límites de la escala se aceptan', async () => {
    const wrapper = await submitWith({
      'min-humidity': '0', 'max-humidity': '100', 'min-light': '0', 'max-light': '24',
    })

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('corregir el valor hace desaparecer el error al volver a guardar', async () => {
    const wrapper = await submitWith({ 'max-humidity': '150' })
    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(true)

    await wrapper.find('[data-test="max-humidity"]').setValue('90')
    await wrapper.find('[data-test="species-form"]').trigger('submit')

    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(false)
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  // --- Validación al salir del campo (blur) ---

  it('un valor fuera de escala se señala al salir del campo, sin esperar al envío', async () => {
    const wrapper = await mountForm()

    await wrapper.find('[data-test="max-humidity"]').setValue('150')
    await wrapper.find('[data-test="max-humidity"]').trigger('blur')

    expect(wrapper.find('[data-test="humidity-error"]').text()).toContain('entre 0 y 100')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('un mínimo por encima del máximo se señala al salir de cualquiera de los dos campos', async () => {
    const wrapper = await mountForm()
    await wrapper.find('[data-test="min-temperature"]').setValue('40')
    await wrapper.find('[data-test="max-temperature"]').setValue('10')

    await wrapper.find('[data-test="min-temperature"]').trigger('blur')

    expect(wrapper.find('[data-test="temperature-error"]').text()).toContain('no puede superar')
  })

  it('pasar de un extremo al otro con el otro aún vacío no regaña antes de tiempo', async () => {
    const wrapper = await mountForm()
    await wrapper.find('[data-test="min-light"]').setValue('')

    await wrapper.find('[data-test="min-light"]').trigger('blur')

    expect(wrapper.find('[data-test="light-error"]').exists()).toBe(false)
  })

  it('corregir el valor hace desaparecer el error al teclear, sin volver a salir del campo', async () => {
    const wrapper = await mountForm()
    await wrapper.find('[data-test="max-humidity"]').setValue('150')
    await wrapper.find('[data-test="max-humidity"]').trigger('blur')
    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(true)

    await wrapper.find('[data-test="max-humidity"]').setValue('90')

    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(false)
  })

  it('mientras se teclea un valor correcto por primera vez no aparece ningún error', async () => {
    const wrapper = await mountForm()

    await wrapper.find('[data-test="max-humidity"]').setValue('9')
    await wrapper.find('[data-test="max-humidity"]').setValue('90')

    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(false)
  })

  it('cada rango valida el suyo al salir del campo', async () => {
    const wrapper = await mountForm()
    await wrapper.find('[data-test="max-light"]').setValue('30')

    await wrapper.find('[data-test="max-light"]').trigger('blur')

    expect(wrapper.find('[data-test="light-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="humidity-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="temperature-error"]').exists()).toBe(false)
  })
})
