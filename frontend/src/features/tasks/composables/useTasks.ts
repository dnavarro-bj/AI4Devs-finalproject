import { computed, reactive, ref } from 'vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { tasksApiService } from '../services/tasks.api.service'
import {
  TASK_TYPE_LABELS,
  type Task,
  type TaskFilters,
} from '../types/task.types'

export type TasksView = 'agenda' | 'calendar' | 'completed'

const MS_PER_DAY = 86_400_000

/**
 * El caso de uso de la pantalla de tareas: una sola carga, tres vistas y sus filtros.
 *
 * **Carga una vez.** Las tres vistas leen el mismo estado; alternar entre ellas no vuelve a pedir
 * nada. Tres consultas independientes podrían divergir, y es justo lo que el criterio de aceptación
 * del ticket excluye: que muestren los mismos datos.
 *
 * Los filtros se aplican aquí, sobre los datos ya cargados. Con T-22 pasarán al servidor
 * (ADR-009); dejarlos en el composable hace que sea cambiar dónde se aplican, no rehacer la pantalla.
 */
export function useTasks() {
  const today = useReferenceDate()

  const tasks = ref<Task[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  const view = ref<TasksView>('agenda')
  const month = ref(today.value.slice(0, 7))
  const filters = reactive<TaskFilters>({ location: '', type: '', priority: '', due: '' })

  async function load() {
    loading.value = true
    error.value = null

    const result = await tasksApiService.list()
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    tasks.value = result.data!
  }

  const matches = (task: Task) =>
    (!filters.location || task.location === filters.location)
    && (!filters.type || task.type === filters.type)
    && (!filters.priority || task.priority === filters.priority)
    && matchesDue(task)

  /** El vencimiento se compara con la fecha de referencia, igual que en la agenda. */
  function matchesDue(task: Task): boolean {
    if (filters.due === 'overdue') return task.status === 'pending' && task.due < today.value
    if (filters.due === 'today') return task.due === today.value
    return true
  }

  const filtered = computed(() => tasks.value.filter(matches))
  const pending = computed(() => filtered.value.filter((task) => task.status === 'pending'))
  const completed = computed(() => filtered.value
    .filter((task) => task.status === 'completed')
    .sort((a, b) => b.due.localeCompare(a.due)))

  /** Lo que ofrecen los filtros sale de **todas** las tareas, no de las ya filtradas. */
  const locationOptions = computed(() => [
    { value: '', label: 'Todas las localizaciones' },
    ...[...new Set(tasks.value.map((task) => task.location))].sort()
      .map((location) => ({ value: location, label: location })),
  ])

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    ...Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  ]

  const priorityOptions = [
    { value: '', label: 'Cualquier prioridad' },
    { value: 'high', label: 'Alta' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Baja' },
  ]

  const agendaEntries = computed(() => pending.value.map((task) => ({
    id: task.id,
    due: task.due,
    title: task.title,
    detail: `${task.target} · ${task.location}`,
    task,
  })))

  const calendarEntries = computed(() => pending.value.map((task) => ({
    id: task.id,
    date: task.due,
    label: `${task.time ? `${task.time} · ` : ''}${task.title}`,
    tone: task.due < today.value ? ('danger' as const) : ('neutral' as const),
  })))

  /** Cuánto hace que venció, o `null` si no ha vencido. Se calcula; no se almacena. */
  function overdueFor(due: string): string | null {
    const days = Math.round((Date.parse(`${today.value}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / MS_PER_DAY)
    if (days <= 0) return null
    return days === 1 ? 'Hace 1 día' : `Hace ${days} días`
  }

  const SHORT_DATE = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  /**
   * Cuándo es la tarea, como la agenda del prototipo la cuenta: hoy, la hora o «Flexible»; otro día,
   * la fecha con cuánto hace que venció o la hora. Se calcula con la fecha de referencia.
   */
  function timing(task: Task): { main: string, hint: string } {
    if (task.due === today.value) return { main: task.time ?? 'Flexible', hint: 'Hoy' }
    return {
      main: SHORT_DATE.format(new Date(`${task.due}T00:00:00Z`)).replace('.', ''),
      hint: overdueFor(task.due) ?? task.time ?? '',
    }
  }

  const hasTasks = computed(() => tasks.value.length > 0)

  return {
    today,
    tasks,
    loading,
    error,
    view,
    month,
    filters,
    load,
    pending,
    completed,
    agendaEntries,
    calendarEntries,
    locationOptions,
    typeOptions,
    priorityOptions,
    overdueFor,
    timing,
    hasTasks,
  }
}
