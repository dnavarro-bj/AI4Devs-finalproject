import { computed, ref, watch } from 'vue'
import { useUrlState } from '@shared/composables/useUrlState'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import type { UrlSchema } from '@shared/utils/urlState'
import { useLocations } from '@features/locations/composables/useLocations'
import { tasksApiService } from '../services/tasks.api.service'
import { calendarEntries, agendaDue, monthRange, taskTiming } from '../mappers/task.mapper'
import {
  CLOSED_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  type Task,
  type TaskListQuery,
} from '../types/task.types'

export type TasksView = 'agenda' | 'calendar' | 'completed'

/** El tamaño máximo de página del API: la agenda carga **una** página y avisa si hay más. */
export const AGENDA_SIZE = 500
const COMPLETED_SIZE = 25

const URL_SCHEMA = {
  view: { kind: 'enum', values: ['calendar', 'completed'] },
  month: { kind: 'text' },
  location: { kind: 'text' },
  /** Las tareas que afectan a una planta: lo que enlaza su ficha. */
  plant: { kind: 'text' },
  type: { kind: 'enum', values: TASK_TYPES },
  priority: { kind: 'enum', values: TASK_PRIORITIES },
  due: { kind: 'enum', values: ['overdue', 'today'] },
} as const satisfies UrlSchema

/**
 * El caso de uso de la pantalla de tareas: tres vistas sobre el API, con sus filtros en la URL.
 *
 * **La agenda no agrupa**: el kit clasifica con la fecha de referencia, así que aquí solo se pide al
 * servidor lo pendiente **ordenado por periodo**, hasta una página. Si hay más de las que caben, lo
 * dice (`truncated`): una agenda que parece completa y no lo es, es peor que una que avisa. El
 * **calendario** pide el mes visible, no filtra el cliente; **completadas** pide lo cerrado, paginado.
 *
 * Toda petición lleva `today`: el servidor no conoce la zona de quien pregunta, y «vencida» es una
 * comparación contra el día que declara el cliente.
 */
export function useTasks() {
  const today = useReferenceDate()
  const { state } = useUrlState(URL_SCHEMA)
  const { loadAll } = useLocations()

  const view = computed<TasksView>({
    get: () => (state.view || 'agenda') as TasksView,
    set: (value) => { state.view = value === 'agenda' ? '' : value },
  })

  const month = computed({
    get: () => (/^\d{4}-\d{2}$/.test(state.month) ? state.month : today.value.slice(0, 7)),
    set: (value: string) => { state.month = value === today.value.slice(0, 7) ? '' : value },
  })

  const agenda = ref<Task[]>([])
  const agendaTotal = ref(0)
  const calendar = ref<Task[]>([])
  const completed = ref<Task[]>([])
  const completedTotal = ref(0)
  const completedPage = ref(0)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const locations = ref<{ value: string, label: string }[]>([])

  /** Cada recarga lleva un número: una respuesta vieja no pisa a la última. */
  let latest = 0

  function criteria(): TaskListQuery {
    return {
      today: today.value,
      ...(state.type ? { type: [state.type] } : {}),
      ...(state.priority ? { priority: [state.priority] } : {}),
      ...(state.location ? { location: state.location, includeDescendants: true } : {}),
      ...(state.plant ? { plant: state.plant } : {}),
      ...(state.due ? { due: state.due as 'overdue' | 'today' } : {}),
    }
  }

  async function load() {
    const current = ++latest
    loading.value = true
    error.value = null

    const base = criteria()
    const requests = [
      tasksApiService.list({ ...base, status: ['pendiente'], sort: 'due,asc', size: AGENDA_SIZE }),
      view.value === 'calendar'
        // El calendario es del mes: el vencimiento (`due`) filtra la agenda, no el mes visible.
        ? tasksApiService.list({ ...base, due: undefined, status: ['pendiente'], sort: 'due,asc', size: AGENDA_SIZE, ...monthRange(month.value) })
        : null,
      view.value === 'completed'
        ? tasksApiService.list({ ...base, due: undefined, status: CLOSED_STATUSES, sort: 'due,desc', size: COMPLETED_SIZE, page: completedPage.value })
        : null,
    ] as const

    const [agendaResult, calendarResult, completedResult] = await Promise.all(requests)
    if (current !== latest) return
    loading.value = false

    const failed = [agendaResult, calendarResult, completedResult].find((result) => result && !result.success)
    if (failed) {
      error.value = failed.error!.message
      return
    }

    agenda.value = agendaResult.data!.content
    agendaTotal.value = agendaResult.data!.totalElements
    if (calendarResult) calendar.value = calendarResult.data!.content
    if (completedResult) {
      completed.value = completedResult.data!.content
      completedTotal.value = completedResult.data!.totalElements
    }
  }

  // Cualquier cambio de criterio, vista o mes vuelve a pedir; los criterios devuelven la lista a su primera página.
  watch(() => [state.type, state.priority, state.location, state.plant, state.due], () => {
    completedPage.value = 0
    load()
  })
  watch(() => [state.view, state.month], load)

  async function loadLocations() {
    const result = await loadAll()
    if (result.success) {
      locations.value = result.data!.map((location) => ({ value: location.id, label: location.path || location.name }))
    }
  }

  function setCompletedPage(page: number) {
    completedPage.value = page
    load()
  }

  const agendaEntries = computed(() => agenda.value.map((task) => ({
    id: task.id,
    due: agendaDue(task, today.value),
    title: task.title,
    task,
  })))

  const calendarItems = computed(() => calendarEntries(calendar.value, month.value, today.value))

  const typeOptions = TASK_TYPES.map((value) => ({ value, label: TASK_TYPE_LABELS[value] }))
  const priorityOptions = TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] }))

  const hasFilters = computed(() => Boolean(state.type || state.priority || state.location || state.plant || state.due))

  return {
    today,
    state,
    view,
    month,
    loading,
    error,
    load,
    loadLocations,
    agendaEntries,
    agendaTotal,
    /** Hay más tareas pendientes de las que caben en la página que se pidió. */
    truncated: computed(() => agendaTotal.value > agenda.value.length),
    calendarItems,
    completed,
    completedTotal,
    completedPage,
    completedPages: computed(() => Math.max(1, Math.ceil(completedTotal.value / COMPLETED_SIZE))),
    setCompletedPage,
    locationOptions: locations,
    typeOptions,
    priorityOptions,
    hasFilters,
    timing: (task: Task) => taskTiming(task, today.value),
  }
}
