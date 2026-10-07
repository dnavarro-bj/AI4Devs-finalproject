import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createApiDouble, settle } from './helpers/apiDouble'
import { plantDetail } from './helpers/fixtures'
import PlantDetailPage from '../app/pages/plants/[id]/index.vue'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { ok } from '@shared/types/api.types'
import type { Task } from '@features/tasks/types/task.types'

const api = createApiDouble()
mockNuxtImport('getApiClient', () => () => api)
mockNuxtImport('useRoute', () => () => ({ params: { id: '882687672222443468' } }))

/** Requirement «Próximo trabajo en la ficha del ejemplar». «Hoy» es 2026-10-07. */
const TODAY = '2026-10-07'

const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id, type: 'riego', title: `Tarea ${id}`, priority: 'normal', status: 'pendiente',
  dueFrom: '2026-10-09', dueTo: '2026-10-09', origin: 'manual',
  target: { kind: 'location', location: { id: '300001', name: 'Invernadero 1', path: 'Invernadero 1' } },
  createdAt: '', updatedAt: '', ...patch,
})

const page = (content: Task[]) => ok({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 5 })

function serve() {
  const envelope = (content: unknown[]) => ({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 25 })
  api.get.mockImplementation((path: string) => Promise.resolve(
    path === '/locations' || ['/care-records', '/status-changes', '/movements', '/timeline'].some((suffix) => path.endsWith(suffix))
      ? envelope([])
      : plantDetail(),
  ))
}

async function open() {
  const wrapper = await mountSuspended(PlantDetailPage)
  await settle()
  await settle()
  return wrapper
}

describe('próximo trabajo de la ficha', () => {
  beforeEach(() => {
    useReferenceDate().value = TODAY
    Object.values(api).forEach((fn) => fn.mockReset())
    serve()
  })
  afterEach(() => vi.restoreAllMocks())

  it('pide las tareas pendientes que afectan a la planta, las más próximas primero, con la fecha de referencia', async () => {
    const list = vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([]))
    await open()

    expect(list).toHaveBeenCalledWith(expect.objectContaining({
      plant: '882687672222443468', status: ['pendiente'], sort: 'due,asc', today: TODAY,
    }))
  })

  it('muestra las tareas propias y las de su localización, sin marca de ejemplo', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([
      task('1', { title: 'Revisar esta planta', target: { kind: 'plants', plantCount: 1 } }),
      task('2', { title: 'Regar el invernadero' }),
    ]))
    const wrapper = await open()

    const panel = wrapper.find('[data-test="next-work"]')
    expect(panel.findAll('[data-test="next-work-item"]').map((item) => item.find('strong').text()))
      .toEqual(['Revisar esta planta', 'Regar el invernadero'])
    expect(panel.attributes('data-mock')).toBeUndefined()
    expect(panel.text()).not.toContain('T-22')
  })

  it('una tarea vencida se distingue por el texto, no solo por el color', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([task('1', { dueFrom: '2026-10-01', dueTo: '2026-10-02' })]))
    const wrapper = await open()

    expect(wrapper.find('[data-test="next-work-overdue"]').text()).toContain('Vencida')
  })

  it('«de un vistazo» muestra la próxima tarea real', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([task('1', { title: 'Revisar esta planta' })]))
    const wrapper = await open()

    const item = wrapper.findAll('[data-test="summary-item"], .summary-grid__item').find((node) => node.text().includes('Próxima tarea'))
    expect(item?.text() ?? wrapper.text()).toContain('Revisar esta planta')
    expect(wrapper.find('[data-test="next-work"]').exists()).toBe(true)
  })

  it('sin trabajo pendiente lo dice y ofrece crear una', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([]))
    const wrapper = await open()

    expect(wrapper.find('[data-test="next-work-empty"]').text()).toContain('No hay trabajo pendiente')
    expect(wrapper.find('[data-test="create-task-here"]').exists()).toBe(true)
  })

  it('«Crear tarea» abre el formulario con esta planta como destino', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([]))
    const wrapper = await open()

    await wrapper.find('[data-test="create-task-here"]').trigger('click')
    await settle()
    await settle()

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Nueva tarea')
    expect(dialog.find('[data-test="destination-chosen"]').text()).toContain('CAT-GRUSS')
    expect(dialog.find('[data-test="destination-count"]').text()).toContain('1 planta')
  })

  it('el botón «Crear tarea» de la cabecera abre el mismo formulario con esta planta', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([]))
    const wrapper = await open()

    await wrapper.find('[data-test="create-task"]').trigger('click')
    await settle()
    await settle()

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Nueva tarea')
    expect(dialog.find('[data-test="destination-chosen"]').text()).toContain('CAT-GRUSS')
    expect(dialog.find('[data-test="destination-count"]').text()).toContain('1 planta')
  })

  it('«Ver todas» lleva a las tareas filtradas por la planta', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(page([task('1')]))
    const wrapper = await open()

    expect(wrapper.find('[data-test="all-tasks"]').attributes('href')).toBe('/tasks?plant=882687672222443468')
  })

  it('si el API de tareas falla, la ficha sigue y lo dice en su panel', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'sin servicio' } })
    const wrapper = await open()

    expect(wrapper.find('[data-test="next-work-error"]').text()).toContain('sin servicio')
    expect(wrapper.text()).toContain('Bola verde')
  })
})
