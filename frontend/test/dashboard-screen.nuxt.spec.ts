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
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import type { LocationSummary } from '@features/locations/types/location.types'
import type { ActivityEntry } from '@features/activity/types/activity.types'
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
  const page = <T>(content: T[]): PageResponse<T> => ({
    content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25,
  })

  const zones: LocationSummary[] = [
    { id: '300001', name: 'Invernadero 1', code: 'LOC-I1', parentId: null, path: 'Invernadero 1', locationType: 'invernadero', capacity: null, plantCount: 2, plantCountTotal: 12, pendingTasks: 3, openAlerts: { count: 2, highestSeverity: 'critica' } },
    { id: '300002', name: 'Invernadero 2', code: 'LOC-I2', parentId: null, path: 'Invernadero 2', locationType: 'invernadero', capacity: null, plantCount: 4, plantCountTotal: 4, pendingTasks: 0, openAlerts: { count: 0 } },
  ]

  const activity: ActivityEntry[] = [
    { id: 'a1', type: 'lote', occurredAt: '2026-10-07T09:00:00Z', batch: { id: '9', action: 'lectura', plantCount: 31 } },
    { id: 'a2', type: 'tarea', occurredAt: '2026-10-07T08:00:00Z', task: { id: '3', type: 'riego', title: 'Regar bandejas', affectedPlants: 6 } },
    { id: 'a3', type: 'comentario', occurredAt: '2026-10-06T08:00:00Z', plant: { id: '5', code: 'CAT-GRUSS-01', nickname: 'Con ficha' }, comment: { excerpt: 'Marca en el lado oeste' } },
  ]

  /** Cada ruta su respuesta: localizaciones y actividad comparten el doble del cliente. */
  const serve = (options: { locations?: LocationSummary[], activity?: ActivityEntry[], failActivity?: boolean, failLocations?: boolean } = {}) => {
    api.get.mockReset()
    api.get.mockImplementation(async (path: string) => {
      if (path.startsWith('/activity')) {
        if (options.failActivity) throw new ApiError(500, 'Sin actividad')
        return page(options.activity ?? activity)
      }
      if (path.startsWith('/locations')) {
        if (options.failLocations) throw new ApiError(500, 'No se ha podido completar la operación.')
        return page(options.locations ?? zones)
      }
      return page([])
    })
  }

  beforeEach(() => {
    useReferenceDate().value = '2026-10-07'
    installTasksFake()
    resetAlertsFake([
      makeAlert({ id: '1', severity: 'media', reason: 'Humedad fuera del rango efectivo', plant: plantSubject('CAT-ASTRO-12', 'Astrophytum asterias', '7') }),
      makeAlert({ id: '2', severity: 'critica', reason: 'Temperatura por debajo del mínimo', lastDetectedAt: '2026-10-07T08:00:00Z' }),
      makeAlert({ id: '3', severity: 'baja', status: 'revisada', reason: 'Riego retrasado', plant: plantSubject('CAT-MAMMI-07', 'Mammillaria bocasana', '8') }),
      makeAlert({ id: '4', severity: 'critica', status: 'resuelta', reason: 'Ya cerrada' }),
      makeAlert({ id: '5', source: 'sin_revisar', category: 'seguimiento', severity: 'baja', reason: 'Sin revisar durante 43 días', plant: plantSubject('CAT-GRUSS-01', 'Echinocactus grusonii', '9') }),
      makeAlert({ id: '6', source: 'sin_revisar', category: 'seguimiento', severity: 'baja', status: 'resuelta', reason: 'Sin revisar (cerrada)' }),
    ])
    installAlertsFake()
    serve()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function open() {
    const wrapper = await mountSuspended(DashboardPage)
    await settle()
    return wrapper
  }

  const tiles = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.findAll('[data-test="work-summary"] a')

  it('lo primero tras la cabecera y las acciones rápidas son las cuatro cifras de trabajo, antes que cualquier panel', async () => {
    const wrapper = await open()

    expect(tiles(wrapper)).toHaveLength(4)
    const html = wrapper.html()
    expect(html.indexOf('data-test="quick-actions"')).toBeLessThan(html.indexOf('data-test="work-summary"'))
    expect(html.indexOf('data-test="work-summary"')).toBeLessThan(html.indexOf('data-test="agenda-panel"'))
  })

  it('cada cifra abre el conjunto que representa, ya filtrado', async () => {
    const wrapper = await open()

    expect(tiles(wrapper).map((link) => link.attributes('href'))).toEqual([
      '/tasks?due=overdue',
      '/tasks?due=today',
      '/alerts?status=open',
      '/alerts?source=sin_revisar&status=open',
    ])
  })

  it('«plantas sin revisar» sale de las alertas abiertas de ese origen, no de un cálculo propio', async () => {
    const wrapper = await open()

    const tile = tiles(wrapper)[3]!
    expect(tile.text()).toContain('Plantas sin revisar')
    // Hay dos alertas de «sin revisar»: la abierta cuenta y la resuelta no.
    expect(tile.find('.stat-tile__value').text()).toBe('1')
  })

  it('si no hay ninguna planta sin revisar la cifra dice 0 y sigue abriendo la bandeja', async () => {
    resetAlertsFake([makeAlert({ id: '1' })])
    const wrapper = await open()

    const tile = tiles(wrapper)[3]!
    expect(tile.find('.stat-tile__value').text()).toBe('0')
    expect(tile.attributes('href')).toBe('/alerts?source=sin_revisar&status=open')
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
    const overdueOn = async () => Number(tiles(wrapper)[0]!.find('.stat-tile__value').text())
    const before = await overdueOn()

    useReferenceDate().value = '2026-10-14'
    const later = await open()

    expect(Number(tiles(later)[0]!.find('.stat-tile__value').text())).toBeGreaterThan(before)
  })

  it('la carga por zona dice las plantas, las tareas y las alertas de cada zona, con barra proporcional a la mayor', async () => {
    const wrapper = await open()

    const rows = wrapper.findAll('[data-test="zone-load"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Invernadero 1')
    expect(rows[0]!.text()).toContain('12 plantas')
    expect(rows[0]!.text()).toContain('3 tareas')
    expect(rows[0]!.text()).toContain('2 alertas')
    expect(rows[0]!.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('12')
    expect(rows[1]!.find('[role="progressbar"]').attributes('aria-valuemax')).toBe('12')
    expect(rows[0]!.find('a').attributes('href')).toBe('/locations/300001')
  })

  it('una zona sin trabajo ni alertas lo dice en vez de ocultarse', async () => {
    const wrapper = await open()

    const quiet = wrapper.findAll('[data-test="zone-load"]')[1]!
    expect(quiet.text()).toContain('0 tareas')
    expect(quiet.text()).toContain('0 alertas')
  })

  it('una localización sin recuento de tareas se cuenta como cero, sin romper la tarjeta', async () => {
    serve({ locations: [{ ...zones[0]!, pendingTasks: undefined, openAlerts: undefined }] })
    const wrapper = await open()

    expect(wrapper.find('[data-test="zone-load"]').text()).toContain('0 tareas')
  })

  it('ningún bloque del Dashboard lleva marca de maqueta ni de ticket', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="mock-notice"]').exists()).toBe(false)
    expect(wrapper.find('[data-mock="true"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="zone-tasks-pending"]').exists()).toBe(false)
    for (const ticket of ['T-22', 'T-23', 'T-24']) expect(wrapper.text()).not.toContain(ticket)
  })

  it('la cifra de alertas cuenta las abiertas del API y avisa de las críticas', async () => {
    const wrapper = await open()

    const tile = tiles(wrapper)[2]!
    expect(tile.find('.stat-tile__value').text()).toBe('4')
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

  it('una cifra a cero no se presenta como crítica ni como atención: el nivel solo acompaña a lo que existe', async () => {
    resetAlertsFake([])
    const wrapper = await open()

    // Sin alertas abiertas, la cifra de alertas no dice «Atención»; es neutra.
    expect(tiles(wrapper)[2]!.text()).not.toContain('Atención')
    expect(tiles(wrapper)[2]!.text()).not.toContain('Crítico')
  })

  it('con tareas vencidas la cifra sí lo dice con texto, no solo con color', async () => {
    const wrapper = await open()

    const overdue = tiles(wrapper)[0]!
    expect(Number(overdue.find('.stat-tile__value').text())).toBeGreaterThan(0)
    expect(overdue.text()).toContain('Crítico')
  })

  it('sin alertas abiertas la cifra es 0 y el panel lo dice', async () => {
    resetAlertsFake([])
    const wrapper = await open()

    expect(tiles(wrapper)[2]!.find('.stat-tile__value').text()).toBe('0')
    expect(tiles(wrapper)[2]!.text()).toContain('Ninguna crítica')
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

  it('si fallan las tareas, el panel de la agenda lo explica con reintento y el resto sigue visible', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(fail(domainError(ErrorCodes.SERVER_ERROR, 'Sin tareas', 500)))
    const wrapper = await open()

    expect(wrapper.find('[data-test="tasks-error"]').text()).toContain('Sin tareas')
    expect(wrapper.find('[data-test="retry-tasks"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="alerts-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="zones-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="activity-panel"]').exists()).toBe(true)
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
    serve({ failLocations: true })

    const wrapper = await open()

    expect(wrapper.find('[data-test="zones-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="retry-zones"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="agenda-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="work-summary"]').exists()).toBe(true)
  })

  describe('actividad reciente', () => {
    it('es un panel de la columna lateral con las últimas entradas, cada lote en una sola línea', async () => {
      const wrapper = await open()

      const lines = wrapper.findAll('[data-test="dashboard-activity"] li')
      expect(lines).toHaveLength(3)
      expect(lines[0]!.text()).toContain('Lectura en 31 plantas')
      expect(lines[1]!.text()).toContain('Regar bandejas')
      expect(lines[1]!.text()).toContain('6 plantas')
      expect(wrapper.find('[data-test="activity-panel"] [data-test="activity-error"]').exists()).toBe(false)
    })

    it('un comentario enlaza a la ficha de su planta y enseña el comienzo del texto', async () => {
      const wrapper = await open()

      const comment = wrapper.findAll('[data-test="dashboard-activity"] li')[2]!
      expect(comment.text()).toContain('CAT-GRUSS-01')
      expect(comment.text()).toContain('Marca en el lado oeste')
      expect(comment.find('a').attributes('href')).toBe('/plants/5')
    })

    it('pide solo las últimas entradas', async () => {
      await open()

      expect(api.get).toHaveBeenCalledWith('/activity', expect.objectContaining({ size: 8 }))
    })

    it('sin actividad lo dice', async () => {
      serve({ activity: [] })
      const wrapper = await open()

      expect(wrapper.find('[data-test="activity-empty"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="dashboard-activity"]').exists()).toBe(false)
    })

    it('si falla, lo explica con reintento y el resto del Dashboard sigue visible', async () => {
      serve({ failActivity: true })
      const wrapper = await open()

      expect(wrapper.find('[data-test="activity-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="agenda-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="zones-panel"]').exists()).toBe(true)

      serve()
      await wrapper.find('[data-test="retry-activity"]').trigger('click')
      await settle(); await settle()
      expect(wrapper.find('[data-test="activity-error"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-test="dashboard-activity"] li')).toHaveLength(3)
    })
  })

  describe('acciones rápidas', () => {
    const quick = (wrapper: Awaited<ReturnType<typeof open>>, name: string) => wrapper.find(`[data-test="quick-${name}"]`)

    it('ofrece las seis acciones frecuentes bajo la cabecera', async () => {
      const wrapper = await open()

      for (const name of ['add-plant', 'new-task', 'batch', 'agenda', 'locations', 'alerts']) {
        expect(quick(wrapper, name).exists(), name).toBe(true)
      }
    })

    it('las que navegan llevan a su pantalla', async () => {
      const wrapper = await open()

      expect(quick(wrapper, 'add-plant').attributes('href')).toBe('/plants/new')
      expect(quick(wrapper, 'agenda').attributes('href')).toBe('/tasks')
      expect(quick(wrapper, 'locations').attributes('href')).toBe('/locations')
      expect(quick(wrapper, 'alerts').attributes('href')).toBe('/alerts')
    })

    it('«crear tarea» abre el formulario de tarea', async () => {
      const wrapper = await open()

      await quick(wrapper, 'new-task').trigger('click')
      await settle()

      expect(wrapper.find('[data-test="task-dialog"]').text()).toContain('Nueva tarea')
    })

    it('«registrar un cuidado por lote» abre el diálogo de lote pidiendo primero la localización', async () => {
      const wrapper = await open()

      await quick(wrapper, 'batch').trigger('click')
      await settle(); await settle()

      const dialog = wrapper.find('[data-test="batch-dialog"]')
      expect(dialog.exists()).toBe(true)
      expect(dialog.find('[data-test="batch-location"]').exists()).toBe(true)
    })
  })
})
