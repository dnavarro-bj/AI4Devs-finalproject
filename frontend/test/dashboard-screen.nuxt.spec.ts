import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import DashboardPage from '../app/pages/index.vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { installTasksFake } from './support/tasksFake'
import { installAlertsFake, makeAlert, plantSubject, resetAlertsFake } from './support/alertsFake'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { ok, fail, domainError, ErrorCodes } from '@shared/types/api.types'
import type { LocationSummary } from '@features/locations/types/location.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Dashboard de trabajo», que especifica la composición de la
 * pantalla `dashboard` del prototipo: trabajo pendiente primero, agenda a la izquierda, alertas y
 * carga por zona a la derecha. «Hoy» es 2026-10-07; las tareas son las del service (en memoria, con
 * la forma del API) y el resto —localizaciones— se dobla.
 */
describe('dashboard de trabajo', () => {
  const page = (content: LocationSummary[]): PageResponse<LocationSummary> => ({
    content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25,
  })

  beforeEach(() => {
    useReferenceDate().value = '2026-10-07'
    installTasksFake()
    resetAlertsFake([
      makeAlert({ id: '1', severity: 'media', reason: 'Humedad fuera del rango efectivo', plant: plantSubject('CAT-ASTRO-12', 'Astrophytum asterias', '7') }),
      makeAlert({ id: '2', severity: 'critica', reason: 'Temperatura por debajo del mínimo', lastDetectedAt: '2026-10-07T08:00:00Z' }),
      makeAlert({ id: '3', severity: 'baja', status: 'revisada', reason: 'Riego retrasado', plant: plantSubject('CAT-MAMMI-07', 'Mammillaria bocasana', '8') }),
      makeAlert({ id: '4', severity: 'critica', status: 'resuelta', reason: 'Ya cerrada' }),
    ])
    installAlertsFake()
    api.get.mockReset()
    api.get.mockResolvedValue(page([
      { id: '300001', name: 'Invernadero 1', code: 'LOC-I1', parentId: null, path: 'Invernadero 1', locationType: 'invernadero', capacity: null, plantCount: 2, plantCountTotal: 12 },
      { id: '300002', name: 'Invernadero 2', code: 'LOC-I2', parentId: null, path: 'Invernadero 2', locationType: 'invernadero', capacity: null, plantCount: 4, plantCountTotal: 4 },
    ]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function open() {
    const wrapper = await mountSuspended(DashboardPage)
    await settle()
    return wrapper
  }

  it('lo primero tras la cabecera son las tres cifras de trabajo, antes que cualquier panel', async () => {
    const wrapper = await open()

    const summary = wrapper.find('[data-test="work-summary"]')
    expect(summary.findAll('a')).toHaveLength(3)
    const html = wrapper.html()
    expect(html.indexOf('data-test="work-summary"')).toBeLessThan(html.indexOf('data-test="agenda-panel"'))
  })

  it('cada cifra abre el conjunto que representa, ya filtrado', async () => {
    const wrapper = await open()

    const hrefs = wrapper.findAll('[data-test="work-summary"] a').map((link) => link.attributes('href'))
    expect(hrefs).toEqual(['/tasks?due=overdue', '/tasks?due=today', '/alerts'])
  })

  it('resume el siguiente trabajo en tres filas agrupadas por fecha', async () => {
    const wrapper = await open()

    expect(wrapper.findAll('[data-test="agenda-panel"] [data-test="task-row"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-test="agenda-panel"] [data-role="date-group"]')).toHaveLength(2)
  })

  it('la cabecera dice la fecha de referencia, no la del reloj', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="page-eyebrow"]').text().toLowerCase()).toContain('7 de octubre')
  })

  it('«vencidas» se calcula con la fecha de referencia', async () => {
    const wrapper = await open()
    const overdueOn = async () =>
      Number(wrapper.find('[data-test="work-summary"] a').find('.stat-tile__value').text())
    const before = await overdueOn()

    useReferenceDate().value = '2026-10-14'
    const later = await open()

    expect(Number(later.find('[data-test="work-summary"] a .stat-tile__value').text())).toBeGreaterThan(before)
  })

  it('la carga por zona sale de las localizaciones reales, con barra proporcional a la mayor', async () => {
    const wrapper = await open()

    const rows = wrapper.findAll('[data-test="zone-load"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Invernadero 1')
    expect(rows[0]!.text()).toContain('12 plantas')
    expect(rows[0]!.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('12')
    expect(rows[1]!.find('[role="progressbar"]').attributes('aria-valuemax')).toBe('12')
  })

  it('las tareas son reales: ni la agenda ni las cifras de trabajo llevan marca de ejemplo', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="agenda-panel"] [data-test="mock-notice"]').exists()).toBe(false)
    const notices = wrapper.findAll('[data-test="mock-notice"]').map((node) => node.text()).join(' ')
    expect(notices).not.toContain('T-22')
  })

  it('lo único que sigue siendo de ejemplo es el número de tareas por zona, con su ticket', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="zone-tasks-pending"]').text()).toContain('T-24')
    expect(wrapper.text()).not.toContain('T-23')
    expect(wrapper.find('[data-test="alerts-panel"] [data-test="mock-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="mock-notice"]').exists()).toBe(false)
  })

  it('la cifra de alertas cuenta las abiertas del API y avisa de las críticas', async () => {
    const wrapper = await open()

    const tile = wrapper.findAll('[data-test="work-summary"] a')[2]!
    expect(tile.find('.stat-tile__value').text()).toBe('3')
    expect(tile.text()).toContain('1 requiere atención inmediata')
  })

  it('el panel de alertas lista las abiertas más graves primero, con su destino', async () => {
    const wrapper = await open()

    const signals = wrapper.findAll('[data-test="dashboard-alerts"] li')
    expect(signals).toHaveLength(3)
    expect(signals[0]!.text()).toContain('Temperatura por debajo del mínimo')
    expect(signals[0]!.text()).toContain('CAT-FEROC-08')
    expect(wrapper.find('[data-test="dashboard-alerts"]').text()).not.toContain('Ya cerrada')
    expect(signals[0]!.find('a').attributes('href')).toBe('/plants/5')
  })

  it('sin alertas abiertas la cifra es 0 y el panel lo dice', async () => {
    resetAlertsFake([])
    const wrapper = await open()

    expect(wrapper.findAll('[data-test="work-summary"] a')[2]!.find('.stat-tile__value').text()).toBe('0')
    expect(wrapper.findAll('[data-test="work-summary"] a')[2]!.text()).toContain('Ninguna crítica')
    expect(wrapper.find('[data-test="alerts-empty"]').exists()).toBe(true)
  })

  it('si fallan las alertas, lo explica en su panel con reintento y el resto sigue visible', async () => {
    vi.spyOn(alertsApiService, 'list').mockResolvedValueOnce(fail(domainError(ErrorCodes.SERVER_ERROR, 'Sin alertas', 500)))
    const wrapper = await open()

    expect(wrapper.find('[data-test="alerts-error"]').text()).toContain('Sin alertas')
    expect(wrapper.find('[data-test="agenda-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="work-summary"]').exists()).toBe(true)

    vi.spyOn(alertsApiService, 'list').mockImplementation((await import('./support/alertsFake')).alertsFakeService.list)
    await wrapper.find('[data-test="retry-alerts"]').trigger('click')
    await settle(); await settle()
    expect(wrapper.find('[data-test="alerts-error"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="dashboard-alerts"] li')).toHaveLength(3)
  })

  it('las cifras de vencidas y de hoy las cuenta el API con la fecha de referencia', async () => {
    const wrapper = await open()

    const [overdue, today] = wrapper.findAll('[data-test="work-summary"] a .stat-tile__value').map((node) => Number(node.text()))
    // Lo sembrado: dos vencidas (hace 4 días y ayer) y al menos dos que tocan hoy.
    expect(overdue).toBe(2)
    expect(today).toBeGreaterThanOrEqual(2)
  })

  it('crear una tarea desde el Dashboard abre el formulario', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="new-task"]').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="task-dialog"]').text()).toContain('Nueva tarea')
  })

  it('la casilla de una tarea de la agenda abre el diálogo de completar con su alcance', async () => {
    vi.spyOn(plantsApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 500 }))
    const wrapper = await open()

    await wrapper.find('[data-test="agenda-panel"] [data-test="complete-task"]').trigger('click')
    await settle()
    await settle()

    expect(wrapper.find('[data-test="complete-dialog"]').exists()).toBe(true)
  })

  it('si fallan las localizaciones, lo explica en su panel y el resto sigue visible', async () => {
    api.get.mockRejectedValue(new ApiError(500, 'No se ha podido completar la operación.'))

    const wrapper = await open()

    expect(wrapper.find('[data-test="zones-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="retry-zones"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="agenda-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="work-summary"]').exists()).toBe(true)
  })
})
