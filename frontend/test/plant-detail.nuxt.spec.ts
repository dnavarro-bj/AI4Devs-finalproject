import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { careRecord, plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'
import { ApiError } from '@shared/services/httpClient'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/**
 * Escenarios "Ficha de una planta existente", "Ficha de una planta sin tags",
 * "Ficha de una planta inexistente" y "Rangos en la ficha antes de registrar la lectura".
 */
/**
 * La ficha pide **dos** cosas: la planta y su historial de lecturas, que `GET
 * /plants/{id}/care-records` sirve desde T-03 y hasta ahora nadie consumía. El doble tiene que
 * distinguirlas, porque un `mockResolvedValue` único devolvería una planta donde se espera un
 * envelope paginado.
 */
function serve(plant: unknown, records: unknown[] = [], statusChanges: unknown[] = []) {
  const envelope = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })
  api.get.mockImplementation((path: string) => Promise.resolve(
    path.endsWith('/care-records')
      ? envelope(records)
      : path.endsWith('/status-changes') ? envelope(statusChanges) : plant,
  ))
}

describe('ficha de la planta', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.post.mockReset()
  })

  it('muestra nickname, localización, tags y los cuidados de su especie', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const text = wrapper.text()
    expect(text).toContain('Bola verde')
    expect(text).toContain('Invernadero 1')
    expect(text).toContain('globular')
    expect(text).toContain('Echinocactus grusonii')
  })

  it('se pinta sin errores cuando la planta no tiene ningún tag', async () => {
    serve(plantDetail({ tags: [] }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bola verde')
    expect(wrapper.find('[data-test="tags"]').exists()).toBe(true)
  })

  /**
   * El API omite los valores no informados en lugar de mandarlos a `null`: llegan como
   * `undefined`, y la ficha no debe pintarlos como filas vacías.
   */
  it('muestra las cinco magnitudes de la lectura, marcando las no informadas', async () => {
    serve(plantDetail())
    api.post.mockResolvedValue({
      id: '500001',
      plantId: '882687672222443468',
      recordedAt: '2026-09-02T09:00:00Z',
      humidity: 4,
    })
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    // El formulario vive ahora en un diálogo: hay que abrirlo.
    await wrapper.find('[data-test="register-reading"]').trigger('click')
    await wrapper.find('[data-test="humidity"]').setValue('4')
    await wrapper.find('[data-test="care-record-form"]').trigger('submit')
    await settle()

    // Y la lectura aparece en la cronología, con sus medidas en la rejilla comparable.
    const reading = wrapper.find('[data-test="reading-500001"]')
    expect(reading.text()).toContain('Humedad')
    expect(reading.text()).toContain('4 %')
    // Las cinco magnitudes aparecen, con las no informadas marcadas como ausentes y no como cero.
    expect(reading.findAll('[data-role="summary-item"]')).toHaveLength(5)
    expect(reading.findAll('[data-absent="true"]')).toHaveLength(4)
    expect(reading.find('[data-absent="true"]').text()).not.toContain('0')
  })

  it('explica que la planta no existe y ofrece volver al inventario', async () => {
    api.get.mockRejectedValue(new ApiError(404, "La planta '999999999' no existe"))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="error"]').text()).toContain('no existe')
    expect(wrapper.find('[data-test="back-to-inventory"]').attributes('href')).toBe('/plants')
  })

  /**
   * La requirement cambió con `esqueleto-plantas`: los rangos siguen a la vista sin ninguna acción
   * —ahora en el panel de cuidados efectivos—, pero el formulario **ya no ocupa la ficha**.
   */
  it('deja los rangos de la especie visibles sin ninguna acción, y el formulario recogido', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const ranges = wrapper.find('[data-test="effective-care"]')
    expect(ranges.exists()).toBe(true)
    const text = ranges.text()
    expect(text).toContain('10')
    expect(text).toContain('30')
    expect(text).toContain('cada 10-20 dias')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(false)
  })

  it('el formulario aparece al pedir registrar una lectura, y cerrar no registra nada', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await wrapper.find('[data-test="register-reading"]').trigger('click')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(true)

    await wrapper.find('[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.find('[data-test="care-record-form"]').exists()).toBe(false)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('muestra las lecturas anteriores a la sesión, sin registrar ninguna', async () => {
    serve(plantDetail(), [
      careRecord({ id: '600001', recordedAt: '2026-09-05T10:00:00Z', humidity: 31 }),
      careRecord({ id: '600002', recordedAt: '2026-09-01T10:00:00Z', temperature: 24 }),
    ])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.find('[data-test="reading-600001"]').text()).toContain('31 %')
    expect(wrapper.find('[data-test="reading-600002"]').text()).toContain('24 °C')
  })

  it('una planta sin lecturas no muestra ninguna entrada de lectura', async () => {
    serve(plantDetail(), [])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    expect(wrapper.findAll('[data-test^="reading-"]')).toHaveLength(0)
  })

  it('cambia entre las secciones de la ficha sin salir de la planta', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual([
      'Resumen e historial', 'Fotografías', 'Floración', 'Datos',
    ])

    await tabs[1]!.trigger('click')
    // Las secciones sin construir lo explican en lugar de aparecer vacías.
    expect(wrapper.text()).toContain('T-19')
  })
})

/**
 * El riego es una medida de la lectura, no un tipo de evento: la cronología no ofrece «Riego»
 * como filtro propio ni lo inventa en la maqueta.
 */
describe('cronología de la ficha: el riego no es un evento', () => {
  it('no ofrece «Riego» como tipo de evento ni lo simula en los datos de ejemplo', async () => {
    const { MOCK_EVENTS } = await import('@features/plants/mocks/plantDetail.mock')

    expect(MOCK_EVENTS.some((event) => event.type === 'water')).toBe(false)
  })
})

/** Escenarios de «Perfil real del ejemplar en las pantallas»: la ficha con su perfil, estado e historial. */
describe('ficha de la planta: perfil, estado e historial', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.put.mockReset()
    api.post.mockReset()
  })

  const openTab = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>, label: string) => {
    await wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label))!.trigger('click')
    await settle()
  }

  it('la pestaña de datos muestra el perfil real del ejemplar', async () => {
    serve(plantDetail({
      description: 'Ejemplar adulto', germinationYear: 2021, germinationMonth: 4,
      acquiredOn: '2022-03-01', origin: 'intercambio', originNote: 'Con un vecino',
    }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    const data = wrapper.find('.data').text()
    expect(data).toContain('Ejemplar adulto')
    expect(data).toContain('Intercambio')
    expect(data).toContain('Con un vecino')
    expect(data).toContain('04/2021')
    expect(data).toContain('2022')
  })

  it('un perfil vacío no inventa nada: los campos ausentes dicen «Sin indicar»', async () => {
    serve(plantDetail())
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    expect(wrapper.find('[data-test="profile-description"]').text()).toContain('Sin indicar')
    expect(wrapper.find('[data-test="profile-germination"]').text()).toContain('Sin indicar')
  })

  it('la pestaña de datos incluye el historial de cambios de estado', async () => {
    serve(plantDetail(), [], [
      { id: '2', fromStatus: 'activa', toStatus: 'cuarentena', reason: 'Cochinilla', occurredAt: '2026-08-01T09:00:00Z' },
    ])
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await openTab(wrapper, 'Datos')

    expect(wrapper.find('[data-test="status-change"]').text()).toContain('Cochinilla')
  })

  it('cambiar el estado desde la cabecera actualiza la ficha y refresca el historial', async () => {
    serve(plantDetail())
    api.put.mockResolvedValue(plantDetail({ status: 'cuarentena' }))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()
    await openTab(wrapper, 'Datos')
    const before = api.get.mock.calls.filter(([path]) => String(path).endsWith('/status-changes')).length

    await wrapper.find('[data-test="change-status"]').trigger('click')
    await wrapper.find('[data-test="new-status"]').setValue('cuarentena')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="plant-status"]').text()).toContain('En cuarentena')
    expect(wrapper.find('[data-test="status-form"]').exists()).toBe(false)
    expect(api.get.mock.calls.filter(([path]) => String(path).endsWith('/status-changes')).length).toBe(before + 1)
  })

  it('un cambio rechazado por el API deja el estado como estaba y el diálogo abierto', async () => {
    serve(plantDetail())
    api.put.mockRejectedValue(new ApiError(409, "Desde el estado 'muerta' solo se puede volver a 'activa'"))
    const wrapper = await mountSuspended(PlantDetailPage)
    await settle()

    await wrapper.find('[data-test="change-status"]').trigger('click')
    await wrapper.find('[data-test="status-form"]').trigger('submit')
    await settle()

    expect(wrapper.find('[data-test="status-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="plant-status"]').text()).toContain('Activa')
  })
})
