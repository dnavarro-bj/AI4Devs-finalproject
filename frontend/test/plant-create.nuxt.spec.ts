import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail, speciesCare } from './helpers/fixtures'
import NewPlantPage from '../app/pages/plants/new.vue'
import { ApiError } from '@shared/services/httpClient'

const api = createApiDouble()
// `mockNuxtImport` se iza: la fábrica evalúa `navigate` antes de que el `const` exista, así que
// tiene que venir de `vi.hoisted`.
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('navigateTo', () => navigate)

const locationsPage = {
  content: [{ id: '300001', name: 'Invernadero 1' }, { id: '300002', name: 'Bandeja A3' }],
  totalElements: 2, totalPages: 1, pageNumber: 0, pageSize: 25,
}

const speciesPage = {
  content: [
    { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
    { id: '200002', code: 'CAT-MAMMI', scientificName: 'Mammillaria elongata', commonName: 'Dedo de dama' },
  ],
  totalElements: 2, totalPages: 1, pageNumber: 0, pageSize: 25,
}

/** El catálogo devuelve el resumen; los rangos llegan de `GET /species/{id}` (decisión 1). */
function catalogs() {
  api.get.mockImplementation(async (path: string) => {
    if (path === '/locations') return locationsPage
    if (path === '/species') return speciesPage
    if (path === '/species/200001') return speciesCare()
    if (path === '/species/200002') {
      return speciesCare({
        id: '200002',
        scientificName: 'Mammillaria elongata',
        commonName: 'Dedo de dama',
        minHumidity: 15,
        maxHumidity: 40,
        wateringGuideline: 'cada 7-14 dias',
      })
    }
    throw new Error(`ruta inesperada: ${path}`)
  })
}

async function fill(wrapper: Awaited<ReturnType<typeof mountSuspended>>, opts: {
  nickname?: string, locationId?: string, speciesId?: string
}) {
  if (opts.nickname !== undefined) await wrapper.find('[data-test="nickname"]').setValue(opts.nickname)
  if (opts.locationId !== undefined) await wrapper.find('[data-test="location"]').setValue(opts.locationId)
  // La especie se elige pulsando su tarjeta, como en el wireframe.
  if (opts.speciesId !== undefined) await wrapper.find(`[data-test="species-${opts.speciesId}"]`).trigger('click')
  await settle()
}

describe('alta de una planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
    navigate.mockReset()
    // La caché de fichas de especie vive en el estado de la aplicación: se limpia entre tests para
    // que cada uno parta de cero y no dependa del orden.
    clearNuxtState()
    catalogs()
  })

  it('crea la planta y lleva a su ficha sin recarga', async () => {
    api.post.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/plants', {
      nickname: 'Bola verde',
      locationId: '300001',
      speciesId: '200001',
    })
    expect(navigate).toHaveBeenCalledWith('/plants/882687672222443468')
  })

  it('señala que el nickname es obligatorio y no envía la petición', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: '   ', locationId: '300001', speciesId: '200001' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="nickname-error"]').exists()).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('señala el catálogo que falta y no envía la petición', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="location-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="species-error"]').exists()).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('muestra el error del API conservando lo escrito y permite reintentar', async () => {
    api.post.mockRejectedValue(new ApiError(400, "La localización '999' no existe"))
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain("La localización '999' no existe")
    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('Bola verde')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  /** Escenario «Código que llevará la planta en el alta»: el número no existe hasta guardar. */
  it('al elegir la especie enseña el código que llevará, con el número pendiente de asignar', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()
    expect(wrapper.find('[data-test="code-preview"]').text()).not.toContain('CAT-GRUSS')

    await fill(wrapper, { speciesId: '200001' })

    const preview = wrapper.find('[data-test="code-preview"]')
    expect(preview.text()).toContain('CAT-GRUSS-··')
    expect(preview.text()).not.toMatch(/CAT-GRUSS-\d/)
    expect(wrapper.find('[data-test="code-block"]').text().toLowerCase()).toContain('al guardar')
    expect(wrapper.find('[data-test="code-block"]').attributes('data-mock')).toBeUndefined()
  })

  it('muestra los rangos de la especie elegida antes de crear la planta', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    expect(wrapper.find('[data-test="species-ranges"]').exists()).toBe(false)

    await fill(wrapper, { speciesId: '200001' })

    const ranges = wrapper.find('[data-test="species-ranges"]')
    expect(ranges.exists()).toBe(true)
    expect(ranges.text()).toContain('cada 10-20 dias')
    expect(api.get).toHaveBeenCalledWith('/species/200001')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('presenta las fotografías y los cuidados con los patrones del editor', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()
    await fill(wrapper, { speciesId: '200001' })

    const upload = wrapper.find('[data-test="plant-photo-upload"]')
    expect(upload.classes()).toContain('is-inline')
    expect(upload.text()).toContain('Seleccionar archivos')
    expect(upload.find('input[type="file"]').attributes('disabled')).toBeDefined()

    const care = wrapper.find('[data-test="species-ranges"]')
    expect(care.text()).toContain('Hereda de')
    expect(care.text()).toContain('Mineral drenante')
    expect(care.findAll('dl > div')).toHaveLength(4)
  })

  it('cambia los rangos al cambiar de especie, y no repite la llamada si se vuelve a una ya vista', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { speciesId: '200001' })
    await fill(wrapper, { speciesId: '200002' })
    expect(wrapper.find('[data-test="species-ranges"]').text()).toContain('cada 7-14 dias')

    const callsBefore = api.get.mock.calls.filter((c: unknown[]) => c[0] === '/species/200001').length
    await fill(wrapper, { speciesId: '200001' })
    const callsAfter = api.get.mock.calls.filter((c: unknown[]) => c[0] === '/species/200001').length

    expect(wrapper.find('[data-test="species-ranges"]').text()).toContain('cada 10-20 dias')
    expect(callsAfter).toBe(callsBefore)
  })

  // --- Ficha ampliada (`ficha-del-ejemplar`) ---

  it('los campos de la ficha están habilitados: ya no esperan a T-16', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    for (const test of ['status', 'description', 'origin', 'origin-note', 'acquired-on', 'germination-year']) {
      const field = wrapper.find(`[data-test="${test}"]`)
      expect(field.exists(), `falta el campo ${test}`).toBe(true)
      expect(field.attributes('disabled'), `${test} sigue deshabilitado`).toBeUndefined()
      expect(field.attributes('data-mock'), `${test} sigue marcado como maqueta`).toBeUndefined()
    }
    expect(wrapper.find('#plant-editor-origin').text()).not.toContain('T-16')
  })

  it('el mes de germinación está deshabilitado mientras no haya año', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()
    expect(wrapper.find('[data-test="germination-month"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="germination-year"]').setValue('2021')

    expect(wrapper.find('[data-test="germination-month"]').attributes('disabled')).toBeUndefined()
  })

  it('vaciar el año vacía y deshabilita el mes: no puede quedar un mes sin año', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()
    await wrapper.find('[data-test="germination-year"]').setValue('2021')
    await wrapper.find('[data-test="germination-month"]').setValue('4')

    await wrapper.find('[data-test="germination-year"]').setValue('')

    expect(wrapper.find('[data-test="germination-month"]').attributes('disabled')).toBeDefined()
    expect((wrapper.find('[data-test="germination-month"]').element as HTMLSelectElement).value).toBe('')
  })

  it('el estado inicial ofrece solo los que están en curso y por defecto activa', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    const select = wrapper.find('[data-test="status"]')
    expect((select.element as HTMLSelectElement).value).toBe('activa')
    expect(select.findAll('option').map((option) => option.attributes('value'))).toEqual(['activa', 'cuarentena', 'enferma'])
  })

  it('envía la ficha completa y el estado inicial al guardar', async () => {
    api.post.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('[data-test="status"]').setValue('cuarentena')
    await wrapper.find('[data-test="description"]').setValue('Ejemplar adulto')
    await wrapper.find('[data-test="origin"]').setValue('intercambio')
    await wrapper.find('[data-test="origin-note"]').setValue('Con un vecino')
    await wrapper.find('[data-test="acquired-on"]').setValue('2022-03-01')
    await wrapper.find('[data-test="germination-year"]').setValue('2021')
    await wrapper.find('[data-test="germination-month"]').setValue('4')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(api.post).toHaveBeenCalledWith('/plants', {
      nickname: 'Bola verde', locationId: '300001', speciesId: '200001',
      description: 'Ejemplar adulto', germinationYear: 2021, germinationMonth: 4,
      acquiredOn: '2022-03-01', origin: 'intercambio', originNote: 'Con un vecino', status: 'cuarentena',
    })
  })

  it('solo con el año de germinación no envía ningún mes', async () => {
    api.post.mockResolvedValue(plantDetail())
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('[data-test="germination-year"]').setValue('2021')
    await wrapper.find('form').trigger('submit')
    await settle()

    const body = api.post.mock.calls[0]![1] as Record<string, unknown>
    expect(body.germinationYear).toBe(2021)
    expect(body).not.toHaveProperty('germinationMonth')
  })

  it('un año fuera de rango se señala en su campo y no se envía', async () => {
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('[data-test="germination-year"]').setValue('1700')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="germination-year-error"]').exists()).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('un error del API en la ficha se explica sin perder lo escrito', async () => {
    api.post.mockRejectedValue(new ApiError(400, 'No se puede indicar el mes de germinación sin el año'))
    const wrapper = await mountSuspended(NewPlantPage)
    await settle()

    await fill(wrapper, { nickname: 'Bola verde', locationId: '300001', speciesId: '200001' })
    await wrapper.find('[data-test="description"]').setValue('Ejemplar adulto')
    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('germinación')
    expect((wrapper.find('[data-test="description"]').element as HTMLTextAreaElement).value).toBe('Ejemplar adulto')
  })
})
