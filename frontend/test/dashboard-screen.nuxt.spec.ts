import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ApiError } from '@shared/services/httpClient'
import { createApiDouble, settle } from './helpers/apiDouble'
import DashboardPage from '../app/pages/index.vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import type { LocationSummary } from '@features/locations/types/location.types'
import type { PageResponse } from '@shared/types/api.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)

/**
 * Escenarios de la requirement «Dashboard de trabajo», que especifica la composición de la
 * pantalla `dashboard` del prototipo: trabajo pendiente primero, agenda a la izquierda, alertas y
 * carga por zona a la derecha. «Hoy» es el de la maqueta, 2026-09-03.
 */
describe('dashboard de trabajo', () => {
  const page = (content: LocationSummary[]): PageResponse<LocationSummary> => ({
    content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25,
  })

  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue(page([
      { id: '300001', name: 'Invernadero 1', code: 'LOC-I1', parentId: null, path: 'Invernadero 1', locationType: 'invernadero', capacity: null, plantCount: 2, plantCountTotal: 12 },
      { id: '300002', name: 'Invernadero 2', code: 'LOC-I2', parentId: null, path: 'Invernadero 2', locationType: 'invernadero', capacity: null, plantCount: 4, plantCountTotal: 4 },
    ]))
  })

  afterEach(() => {
    useReferenceDate().value = '2026-09-03'
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

    expect(wrapper.find('[data-test="page-eyebrow"]').text().toLowerCase()).toContain('3 de septiembre')
  })

  it('«vencidas» se calcula con la fecha de referencia', async () => {
    const wrapper = await open()
    const overdueOn = async () =>
      Number(wrapper.find('[data-test="work-summary"] a').find('.stat-tile__value').text())
    const before = await overdueOn()

    useReferenceDate().value = '2026-09-10'
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

  it('lo que es de ejemplo lo declara, bloque a bloque y con su ticket', async () => {
    const wrapper = await open()

    const notices = wrapper.findAll('[data-test="mock-notice"]').map((node) => node.text()).join(' ')
    expect(notices).toContain('T-22')
    expect(notices).toContain('T-23')
    expect(notices).toContain('T-24')
    expect(wrapper.find('[data-test="zone-tasks-pending"]').text()).toContain('T-22')
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
