import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import TasksIndex from '../app/pages/tasks/index.vue'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { useToast } from '@shared/composables/useToast'
import { ok } from '@shared/types/api.types'

/**
 * Escenarios de la requirement «Tareas en tres vistas», que especifica la composición de la
 * pantalla `tasks` del prototipo: selector de vista y **la misma lista** detrás de las tres.
 * «Hoy» es el de la maqueta, 2026-09-03.
 */
describe('tareas en tres vistas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useToast().clear()
  })

  async function open() {
    const wrapper = await mountSuspended(TasksIndex)
    await settle()
    return wrapper
  }

  const switchTo = async (wrapper: Awaited<ReturnType<typeof open>>, label: string) => {
    await wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label))!.trigger('click')
    await settle()
  }

  it('la agenda y el calendario muestran las mismas tareas pendientes', async () => {
    const wrapper = await open()

    const inAgenda = wrapper.findAll('[data-role="entry"]').length
    expect(inAgenda).toBeGreaterThan(0)

    await switchTo(wrapper, 'Calendario')
    expect(wrapper.findAll('[data-role="entry"]')).toHaveLength(inAgenda)
  })

  it('el número de la pestaña de agenda es el de tareas pendientes', async () => {
    const wrapper = await open()

    const tab = wrapper.findAll('[role="tab"]').find((node) => node.text().includes('Agenda'))!
    expect(tab.text()).toContain(String(wrapper.findAll('[data-role="entry"]').length))
  })

  it('cambiar de vista no repite ninguna petición de datos', async () => {
    const list = vi.spyOn(tasksApiService, 'list')
    const wrapper = await open()

    await switchTo(wrapper, 'Calendario')
    await switchTo(wrapper, 'Completadas')
    await switchTo(wrapper, 'Agenda')

    expect(list).toHaveBeenCalledTimes(1)
  })

  it('el filtro aplicado se conserva al cambiar de vista', async () => {
    const wrapper = await open()
    const all = wrapper.findAll('[data-role="entry"]').length

    await wrapper.find('select[data-test="filter-priority"]').setValue('high')
    const filtered = wrapper.findAll('[data-role="entry"]').length
    expect(filtered).toBeLessThan(all)

    await switchTo(wrapper, 'Calendario')
    expect(wrapper.findAll('[data-role="entry"]')).toHaveLength(filtered)
  })

  it('«vencida» se calcula: lo anterior a hoy aparece en «Vencidas» con cuánto hace', async () => {
    const wrapper = await open()

    const overdue = wrapper.find('[data-dueness="overdue"]')
    expect(overdue.exists()).toBe(true)
    expect(overdue.text()).toContain('Vencidas')
    expect(overdue.text()).toMatch(/Hace \d+ días?/)
  })

  it('completadas lista lo ya hecho aparte de lo pendiente', async () => {
    const wrapper = await open()
    await switchTo(wrapper, 'Completadas')

    expect(wrapper.find('[data-test="completed-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-dueness]').exists()).toBe(false)
  })

  it('una acción de tarea dice qué ticket la habilita y no cambia ninguna tarea', async () => {
    const wrapper = await open()
    const before = wrapper.findAll('[data-role="entry"]').length

    await wrapper.find('[data-test="complete-task"]').trigger('click')

    expect(useToast().toasts.value.at(-1)!.message).toContain('T-22')
    expect(wrapper.findAll('[data-role="entry"]')).toHaveLength(before)
  })

  it('declara que las tareas son datos de ejemplo y qué ticket las sustituye', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-test="mock-notice"]').text()).toContain('T-22')
  })

  it('abre el alta con todos los campos del editor del wireframe', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="new-task"]').trigger('click')

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Nueva tarea')
    expect(dialog.find('[data-test="task-type"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-priority"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-title"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-destination"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-due"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-time"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-notes"]').exists()).toBe(true)
    expect(dialog.find('[data-test="task-notes-field"]').classes()).toContain('is-wide')
  })

  it('editar reutiliza el formulario y precarga la tarea elegida', async () => {
    const wrapper = await open()
    const first = wrapper.find('[data-test="task-row"]')
    const title = first.find('h3').text()

    await first.find('[data-test="edit-task"]').trigger('click')

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Editar tarea')
    expect((dialog.find('[data-test="task-title"]').element as HTMLInputElement).value).toBe(title)
    expect(dialog.find('[data-test="task-submit"]').text()).toContain('Guardar cambios')
  })

  it('guardar la maqueta cierra el editor y explica que lo conectará T-22', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await wrapper.find('[data-test="task-title"]').setValue('Revisar bancada oeste')
    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.find('[data-test="task-dialog"]').exists()).toBe(false)
    expect(useToast().toasts.value.at(-1)!.message).toContain('T-22')
  })

  it('sin tareas lo explica y ofrece crear la primera', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(ok([]))
    const wrapper = await open()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="empty"]').text()).toContain('Crear')
  })

  it('abierta desde una cifra del Dashboard, llega ya filtrada y lo dice', async () => {
    const wrapper = await mountSuspended(TasksIndex, { route: '/tasks?due=overdue' })
    await settle()

    const groups = wrapper.findAll('[data-dueness]').map((group) => group.attributes('data-dueness'))
    expect(groups).toEqual(['overdue'])
    expect(wrapper.find('[data-test="applied-filters"]').text()).toContain('Vencidas')
  })
})
