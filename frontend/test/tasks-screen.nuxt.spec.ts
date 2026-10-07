import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import TasksIndex from '../app/pages/tasks/index.vue'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { installTasksFake } from './support/tasksFake'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import { locationsApiService } from '@features/locations/services/locations.api.service'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useToast } from '@shared/composables/useToast'
import { ok, fail, domainError, ErrorCodes } from '@shared/types/api.types'

/**
 * Requirements «Tareas sobre datos reales en tres vistas», «Crear y editar una tarea», «Completar una
 * tarea mostrando su alcance», «Completar puede registrar el hecho concreto» y «Reprogramar, omitir y
 * cancelar una tarea». «Hoy» es 2026-10-07; el service es el de la bandera (en memoria, con la forma
 * del API), y el inventario —localizaciones y plantas— se dobla.
 */
enableAutoUnmount(afterEach)

const TODAY = '2026-10-07'

const plant = (id: string, code: string) => ({
  id, code, nickname: `Planta ${id}`, status: 'activa', createdAt: null,
  location: { id: '300001', name: 'Invernadero 1' },
  species: { id: '200001', code: 'CAT-GRUSS', scientificName: 'Echinocactus grusonii', commonName: 'Asiento de suegra' },
})

function pageOf<T>(content: T[]) {
  return ok({ content, totalElements: content.length, totalPages: 1, pageNumber: 0, pageSize: 500 })
}

beforeEach(() => {
  useReferenceDate().value = TODAY
  installTasksFake()
  vi.spyOn(locationsApiService, 'list').mockResolvedValue(pageOf([
    { id: '300001', name: 'Invernadero 1', path: 'Invernadero 1', plantCountTotal: 3 },
    { id: '300002', name: 'Bandeja A3', path: 'Invernadero 1 / Bandeja A3', plantCountTotal: 1 },
  ]) as never)
  vi.spyOn(plantsApiService, 'list').mockResolvedValue(pageOf([plant('1', 'CAT-GRUSS-01'), plant('2', 'CAT-GRUSS-02'), plant('3', 'CAT-GRUSS-03')]) as never)
})

afterEach(() => {
  vi.restoreAllMocks()
  useToast().clear()
})

async function flush() {
  for (let i = 0; i < 4; i++) await settle()
}

async function open(route = '/tasks') {
  const wrapper = await mountSuspended(TasksIndex, { route })
  await flush()
  return wrapper
}

const switchTo = async (wrapper: Awaited<ReturnType<typeof open>>, label: string) => {
  await wrapper.findAll('[role="tab"]').find((tab) => tab.text().includes(label))!.trigger('click')
  await flush()
}

const rowByTitle = (wrapper: Awaited<ReturnType<typeof open>>, title: string) =>
  wrapper.findAll('[data-test="task-row"]').find((row) => row.text().includes(title))!

async function chooseAction(wrapper: Awaited<ReturnType<typeof open>>, title: string, action: string) {
  const row = rowByTitle(wrapper, title)
  await row.find('button[aria-haspopup]').trigger('click')
  await row.findAll('[role="menuitem"]').find((item) => item.text().includes(action))!.trigger('click')
  await flush()
}

describe('tareas sobre datos reales en tres vistas', () => {
  it('la agenda agrupa lo pendiente en vencidas, hoy, próximos y más adelante, sin maqueta', async () => {
    const wrapper = await open()

    const groups = wrapper.findAll('[data-dueness]').map((group) => group.attributes('data-dueness'))
    expect(groups).toEqual(['overdue', 'today', 'soon', 'later'])
    expect(wrapper.find('[data-test="mock-notice"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('T-22')
  })

  it('el número de la pestaña de agenda es el de tareas pendientes', async () => {
    const wrapper = await open()

    const pending = (await tasksApiService.list({ today: TODAY })).data!.totalElements
    const tab = wrapper.findAll('[role="tab"]').find((node) => node.text().includes('Agenda'))!
    expect(tab.text()).toContain(String(pending))
  })

  it('cada tarea vencida dice cuánto hace que venció', async () => {
    const wrapper = await open()

    expect(wrapper.find('[data-dueness="overdue"]').text()).toMatch(/Hace \d+ días?/)
  })

  it('la agenda y el calendario cuentan las mismas tareas pendientes del mes', async () => {
    const wrapper = await open()
    const inAgenda = new Set(wrapper.findAll('[data-test="task-row"]').map((row) => row.find('h3').text()))

    await switchTo(wrapper, 'Calendario')
    const inCalendar = new Set(wrapper.findAll('[data-role="entry"]').map((entry) => entry.text()))

    // Lo que cae este mes está en las dos vistas; el calendario solo ve el mes visible.
    expect([...inCalendar].every((title) => [...inAgenda].some((agendaTitle) => title.includes(agendaTitle)))).toBe(true)
    expect(inCalendar.size).toBeGreaterThan(0)
  })

  it('los filtros se combinan, se ven como criterios y se quitan uno a uno', async () => {
    const wrapper = await open()
    const all = wrapper.findAll('[data-test="task-row"]').length

    await wrapper.find('select[data-test="filter-type"]').setValue('riego')
    await wrapper.find('select[data-test="filter-priority"]').setValue('alta')
    await flush()

    const filtered = wrapper.findAll('[data-test="task-row"]').length
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(all)
    const applied = wrapper.find('[data-test="applied-filters"]').text()
    expect(applied).toContain('Tipo: Riego')
    expect(applied).toContain('Prioridad: Alta')

    const remove = wrapper.findAll('[data-test="applied-filters"] button').find((button) => button.text().includes('Quitar filtro Prioridad'))!
    await remove.trigger('click')
    await flush()
    expect(wrapper.find('[data-test="applied-filters"]').text()).not.toContain('Prioridad: Alta')
    expect(wrapper.findAll('[data-test="task-row"]').length).toBeGreaterThanOrEqual(filtered)
  })

  it('el filtro de localización incluye las sublocalizaciones', async () => {
    const wrapper = await open()

    await wrapper.find('select[data-test="filter-location"]').setValue('300001')
    await flush()

    // La bandeja A3 está dentro del invernadero 1: su riego sale.
    expect(wrapper.text()).toContain('Regar la bandeja A3')
  })

  it('abierta desde una cifra del Dashboard llega filtrada por vencidas, con el filtro a la vista', async () => {
    const wrapper = await open('/tasks?due=overdue')

    expect(wrapper.findAll('[data-dueness]').map((group) => group.attributes('data-dueness'))).toEqual(['overdue'])
    expect(wrapper.find('[data-test="applied-filters"]').text()).toContain('Vencidas')
  })

  it('el calendario resume los días con más tareas de las que caben y crea desde un día', async () => {
    for (let i = 0; i < 4; i++) {
      await tasksApiService.create({ type: 'riego', title: `Extra ${i}`, priority: 'normal', dueFrom: '2026-10-20', locationId: '300001' })
    }
    const wrapper = await open()
    await switchTo(wrapper, 'Calendario')

    // El día 20 acumula más tareas de las que caben: se resume cuántas quedan en vez de recortarlas.
    expect(wrapper.find('td[data-date="2026-10-20"] [data-test="overflow"]').text()).toMatch(/\+\d+ más/)
  })

  it('elegir un día del calendario abre el formulario con esa fecha', async () => {
    const wrapper = await open()
    await switchTo(wrapper, 'Calendario')

    await wrapper.find('td[data-date="2026-10-21"] button').trigger('click')
    await flush()

    expect((wrapper.find('[data-test="task-due"]').element as HTMLInputElement).value).toBe('2026-10-21')
  })

  it('una tarea con periodo aparece en cada día suyo', async () => {
    const wrapper = await open()
    await switchTo(wrapper, 'Calendario')

    // «Cambio de maceta» va de ayer a pasado mañana: ocupa cuatro días seguidos.
    for (const day of ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']) {
      expect(wrapper.find(`td[data-date="${day}"]`).text()).toContain('Cambio de maceta')
    }
  })

  it('completadas lista lo cerrado con su estado en texto', async () => {
    const wrapper = await open()
    await switchTo(wrapper, 'Completadas')

    const list = wrapper.find('[data-test="completed-list"]')
    expect(list.exists()).toBe(true)
    const statuses = wrapper.findAll('[data-test="completed-status"]').map((node) => node.text())
    expect(statuses).toEqual(expect.arrayContaining(['Completada', 'Omitida', 'Cancelada']))
    expect(wrapper.find('[data-dueness]').exists()).toBe(false)
  })

  it('sin tareas lo dice y ofrece crear la primera', async () => {
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 500 }))
    const wrapper = await open()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="empty-create"]').exists()).toBe(true)
  })

  it('si hay más pendientes de las que caben, la agenda lo dice', async () => {
    const real = (await tasksApiService.list({ today: TODAY, size: 3 })).data!
    vi.spyOn(tasksApiService, 'list').mockResolvedValue(ok({ ...real, totalElements: 612 }))
    const wrapper = await open()

    expect(wrapper.find('[data-test="truncated"]').text()).toContain('612')
  })

  it('un fallo del API se explica en línea y se puede reintentar', async () => {
    const list = vi.spyOn(tasksApiService, 'list').mockResolvedValueOnce(fail(domainError(ErrorCodes.SERVER_ERROR, 'El servidor no responde')))
    const wrapper = await open()

    expect(wrapper.find('[data-test="error"]').text()).toContain('El servidor no responde')
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)

    await wrapper.find('[data-test="retry"]').trigger('click')
    await flush()
    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="task-row"]').length).toBeGreaterThan(0)
  })

  it('toda petición lleva la fecha de referencia como today', async () => {
    const list = vi.spyOn(tasksApiService, 'list')
    await open()

    expect(list).toHaveBeenCalled()
    expect(list.mock.calls.every(([query]) => query?.today === TODAY)).toBe(true)
  })

  it('«Completar varias» sigue declarado como T-24 y no cambia nada', async () => {
    const wrapper = await open()
    const before = wrapper.findAll('[data-test="task-row"]').length

    await wrapper.find('[data-test="complete-many"]').trigger('click')

    expect(useToast().toasts.value.at(-1)!.message).toContain('T-24')
    expect(wrapper.findAll('[data-test="task-row"]')).toHaveLength(before)
  })
})

describe('crear y editar una tarea', () => {
  const fillAndSubmit = async (wrapper: Awaited<ReturnType<typeof open>>, title: string, location = '300001') => {
    await wrapper.find('[data-test="task-title"]').setValue(title)
    await wrapper.find('select[data-test="destination-location"]').setValue(location)
    await wrapper.find('[data-test="task-form"]').trigger('submit')
    await flush()
  }

  it('el formulario trae los campos del prototipo y no ofrece hora', async () => {
    const wrapper = await open()

    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Nueva tarea')
    for (const field of ['task-type', 'task-priority', 'task-title', 'task-destination', 'task-due', 'task-due-to', 'task-notes']) {
      expect(dialog.find(`[data-test="${field}"]`).exists()).toBe(true)
    }
    expect(dialog.find('[data-test="task-time"]').exists()).toBe(false)
    expect(dialog.find('input[type="time"]').exists()).toBe(false)
    expect(dialog.find('[data-test="task-impact"]').text()).toContain('no registra un cuidado hasta que se complete')
  })

  it('crear una tarea la añade a la agenda y avisa', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    await fillAndSubmit(wrapper, 'Regar el vivero entero')

    expect(wrapper.find('[data-test="task-dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Regar el vivero entero')
    expect(useToast().toasts.value.at(-1)!.message).toContain('creada')
  })

  it('sin título no se envía y el error está junto al campo', async () => {
    const create = vi.spyOn(tasksApiService, 'create')
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    await wrapper.find('select[data-test="destination-location"]').setValue('300001')
    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.find('[data-test="task-title-error"]').text()).toContain('título')
    expect(create).not.toHaveBeenCalled()
  })

  it('un fin anterior al inicio lo explica y no se envía', async () => {
    const create = vi.spyOn(tasksApiService, 'create')
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    await wrapper.find('[data-test="task-title"]').setValue('Algo')
    await wrapper.find('select[data-test="destination-location"]').setValue('300001')
    await wrapper.find('[data-test="task-due"]').setValue('2026-10-10')
    await wrapper.find('[data-test="task-due-to"]').setValue('2026-10-08')
    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.find('[data-test="task-due-to-error"]').text()).toContain('anterior')
    expect(create).not.toHaveBeenCalled()
  })

  it('sin destino no se envía', async () => {
    const create = vi.spyOn(tasksApiService, 'create')
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    await wrapper.find('[data-test="task-title"]').setValue('Algo')
    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.find('[data-test="destination-error"]').exists()).toBe(true)
    expect(create).not.toHaveBeenCalled()
  })

  it('un destino de plantas concretas se busca, se añade y se quita una a una', async () => {
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    await wrapper.find('input[value="plants"]').setValue(true)
    await wrapper.find('[data-test="destination-search"]').setValue('gruss')
    await new Promise((resolve) => setTimeout(resolve, 300))
    await flush()

    const adds = wrapper.findAll('[data-test="destination-add"]')
    expect(adds.length).toBeGreaterThan(1)
    await adds[0]!.trigger('click')
    await wrapper.findAll('[data-test="destination-add"]')[0]!.trigger('click')

    expect(wrapper.find('[data-test="destination-count"]').text()).toContain('2 plantas')

    await wrapper.find('[data-test="destination-remove"]').trigger('click')
    expect(wrapper.find('[data-test="destination-count"]').text()).toContain('1 planta')
  })

  it('un error del API se muestra en el diálogo y lo escrito se conserva', async () => {
    vi.spyOn(tasksApiService, 'create').mockResolvedValue(fail(domainError(ErrorCodes.VALIDATION_ERROR, 'La localización no existe', 400)))
    const wrapper = await open()
    await wrapper.find('[data-test="new-task"]').trigger('click')
    await flush()

    await fillAndSubmit(wrapper, 'Conservar esto')

    expect(wrapper.find('[data-test="task-error"]').text()).toContain('La localización no existe')
    expect((wrapper.find('[data-test="task-title"]').element as HTMLInputElement).value).toBe('Conservar esto')
  })

  it('editar reutiliza el formulario relleno y guarda los cambios', async () => {
    const wrapper = await open()
    const title = 'Revisar etiquetas'

    await chooseAction(wrapper, title, 'Editar')

    const dialog = wrapper.find('[data-test="task-dialog"]')
    expect(dialog.text()).toContain('Editar tarea')
    expect((dialog.find('[data-test="task-title"]').element as HTMLInputElement).value).toBe(title)
    expect(dialog.find('[data-test="task-submit"]').text()).toContain('Guardar cambios')

    await dialog.find('[data-test="task-title"]').setValue('Revisar etiquetas nuevas')
    await dialog.find('[data-test="task-form"]').trigger('submit')
    await flush()

    expect(wrapper.text()).toContain('Revisar etiquetas nuevas')
  })

})

describe('completar una tarea mostrando su alcance', () => {
  async function openComplete(wrapper: Awaited<ReturnType<typeof open>>, title = 'Regar la bandeja A3') {
    await rowByTitle(wrapper, title).find('[data-test="complete-task"]').trigger('click')
    await flush()
    return wrapper.find('[data-test="complete-dialog"]')
  }

  it('enseña el alcance antes de escribir nada y dice cuántas plantas', async () => {
    const wrapper = await open()
    const complete = vi.spyOn(tasksApiService, 'complete')

    const dialog = await openComplete(wrapper)

    expect(dialog.findAll('[data-test="exclude-plant"]')).toHaveLength(3)
    expect(dialog.find('[data-test="completion-count"]').text()).toContain('3 plantas de 3')
    expect(complete).not.toHaveBeenCalled()
  })

  it('excluir cambia el contador y solo viajan las exclusiones', async () => {
    const wrapper = await open()
    const complete = vi.spyOn(tasksApiService, 'complete')
    const dialog = await openComplete(wrapper)

    await dialog.findAll('[data-test="exclude-plant"]')[1]!.setValue(true)
    expect(dialog.find('[data-test="completion-count"]').text()).toContain('2 plantas de 3')

    await dialog.find('[data-test="complete-confirm"]').trigger('click')
    await flush()

    expect(complete).toHaveBeenCalledWith(expect.any(String), { excludedPlantIds: ['2'] })
    expect(wrapper.find('[data-test="complete-dialog"]').exists()).toBe(false)
    expect(useToast().toasts.value.at(-1)!.message).toContain('2 plantas')
    expect(wrapper.text()).not.toContain('Regar la bandeja A3')
  })

  it('excluirlas todas deshabilita confirmar', async () => {
    const wrapper = await open()
    const dialog = await openComplete(wrapper)

    for (const box of dialog.findAll('[data-test="exclude-plant"]')) await box.setValue(true)

    expect(dialog.find('[data-test="complete-confirm"]').attributes('disabled')).toBeDefined()
    expect(dialog.find('[data-test="completion-count"]').text()).toContain('0 plantas de 3')
  })

  it('una fecha futura se rechaza antes de enviar', async () => {
    const wrapper = await open()
    const complete = vi.spyOn(tasksApiService, 'complete')
    const dialog = await openComplete(wrapper)

    await dialog.find('[data-test="complete-day"]').setValue('2026-10-30')
    await dialog.find('[data-test="complete-confirm"]').trigger('click')
    await flush()

    expect(dialog.find('[data-test="complete-day-error"]').text()).toContain('futura')
    expect(complete).not.toHaveBeenCalled()
  })

  it('un riego ofrece registrar el agua, avisa de que es para todas y la envía', async () => {
    const wrapper = await open()
    const complete = vi.spyOn(tasksApiService, 'complete')
    const dialog = await openComplete(wrapper)

    expect(dialog.find('[data-test="record-hint"]').text()).toContain('todas las plantas incluidas')
    await dialog.find('[data-test="record-water"]').setValue('200')
    await dialog.find('[data-test="complete-confirm"]').trigger('click')
    await flush()

    expect(complete).toHaveBeenCalledWith(expect.any(String), { reading: { waterAmountMl: 200 } })
  })

  it('un cambio de maceta ofrece el trasplante; una protección, nada', async () => {
    const wrapper = await open()

    const repot = await openComplete(wrapper, 'Cambio de maceta de los ejemplares marcados')
    expect(repot.find('[data-test="record-pot"]').exists()).toBe(true)
    await repot.find('[data-test="complete-cancel"]').trigger('click')
    await flush()

    const cold = await openComplete(wrapper, 'Proteger del frío antes de la bajada')
    expect(cold.find('[data-test="complete-record"]').exists()).toBe(false)
  })

  it('un error del API se explica y las exclusiones se conservan', async () => {
    vi.spyOn(tasksApiService, 'complete').mockResolvedValue(fail(domainError(ErrorCodes.CONFLICT, 'La tarea ya no está pendiente', 409)))
    const wrapper = await open()
    const dialog = await openComplete(wrapper)

    await dialog.findAll('[data-test="exclude-plant"]')[0]!.setValue(true)
    await dialog.find('[data-test="complete-confirm"]').trigger('click')
    await flush()

    expect(dialog.find('[data-test="complete-error"]').text()).toContain('ya no está pendiente')
    expect(dialog.find('[data-test="completion-count"]').text()).toContain('2 plantas de 3')
  })

  it('un alcance grande se pagina y conserva las exclusiones al cambiar de página', async () => {
    const many = Array.from({ length: 120 }, (_, i) => plant(String(i + 1), `CAT-GRUSS-${String(i + 1).padStart(3, '0')}`))
    vi.spyOn(plantsApiService, 'list').mockImplementation(async (query) => {
      const size = query?.size ?? 500
      const start = (query?.page ?? 0) * size
      return ok({ content: many.slice(start, start + size), totalElements: many.length, totalPages: Math.ceil(many.length / size), pageNumber: query?.page ?? 0, pageSize: size }) as never
    })
    const wrapper = await open()
    const dialog = await openComplete(wrapper)

    expect(dialog.findAll('[data-test="exclude-plant"]')).toHaveLength(50)
    await dialog.findAll('[data-test="exclude-plant"]')[0]!.setValue(true)

    await dialog.find('nav[aria-label="Páginas del alcance"] [aria-label*="iguiente"], nav[aria-label="Páginas del alcance"] button:last-child').trigger('click')
    await flush()
    expect(dialog.find('[data-test="completion-count"]').text()).toContain('119 plantas de 120')
  })
})

describe('reprogramar, omitir y cancelar una tarea', () => {
  it('reprogramar cambia el periodo y la tarea cambia de grupo', async () => {
    const wrapper = await open()

    await chooseAction(wrapper, 'Revisar etiquetas', 'Reprogramar')
    const dialog = wrapper.find('[data-test="reschedule-dialog"]')
    await dialog.find('[data-test="reschedule-from"]').setValue('2026-10-07')
    await dialog.find('form').trigger('submit')
    await flush()

    expect(wrapper.find('[data-test="reschedule-dialog"]').exists()).toBe(false)
    const today = wrapper.find('[data-dueness="today"]')
    expect(today.text()).toContain('Revisar etiquetas')
  })

  it('omitir con motivo la saca de la agenda y la deja en completadas como omitida', async () => {
    const wrapper = await open()

    await chooseAction(wrapper, 'Revisar etiquetas', 'Omitir')
    const dialog = wrapper.find('[data-test="close-dialog"]')
    expect(dialog.find('[data-test="close-impact"]').text()).toContain('no cuenta como cuidado realizado')
    await dialog.find('[data-test="close-reason"]').setValue('lluvia')
    await dialog.find('form').trigger('submit')
    await flush()

    expect(wrapper.text()).not.toContain('Revisar etiquetas')
    await switchTo(wrapper, 'Completadas')
    const entry = wrapper.findAll('[data-status="omitida"]').find((node) => node.text().includes('Revisar etiquetas'))
    expect(entry!.text()).toContain('lluvia')
  })

  it('cancelar pide confirmación y la deja como cancelada', async () => {
    const wrapper = await open()

    await chooseAction(wrapper, 'Revisar etiquetas', 'Cancelar tarea')
    const dialog = wrapper.find('[data-test="close-dialog"]')
    expect(dialog.text()).toContain('Cancelar tarea')
    await dialog.find('form').trigger('submit')
    await flush()

    await switchTo(wrapper, 'Completadas')
    expect(wrapper.findAll('[data-status="cancelada"]').some((node) => node.text().includes('Revisar etiquetas'))).toBe(true)
  })

  it('un error del API al omitir se explica y conserva el motivo', async () => {
    vi.spyOn(tasksApiService, 'skip').mockResolvedValue(fail(domainError(ErrorCodes.CONFLICT, 'La tarea ya no está pendiente', 409)))
    const wrapper = await open()

    await chooseAction(wrapper, 'Revisar etiquetas', 'Omitir')
    const dialog = wrapper.find('[data-test="close-dialog"]')
    await dialog.find('[data-test="close-reason"]').setValue('lluvia')
    await dialog.find('form').trigger('submit')
    await flush()

    expect(dialog.find('[data-test="close-error"]').text()).toContain('ya no está pendiente')
    expect((dialog.find('[data-test="close-reason"]').element as HTMLTextAreaElement).value).toBe('lluvia')
  })
})
