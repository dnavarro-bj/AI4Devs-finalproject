import { computed, ref } from 'vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import type { Alert } from '@features/alerts/types/alert.types'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { agendaDue, taskTiming } from '@features/tasks/mappers/task.mapper'
import type { Task } from '@features/tasks/types/task.types'

const AGENDA_LIMIT = 3
const ALERTS_LIMIT = 3
const ZONES_LIMIT = 3
const OPEN_ALERTS = ['nueva', 'revisada']
/** Una página: de las vencidas y las de hoy solo hace falta contarlas y ver cuántas son de un periodo. */
const COUNT_SIZE = 500
const MS_PER_DAY = 86_400_000

/**
 * El caso de uso del Dashboard: reúne tareas, alertas y localizaciones **sin duplicar** sus cargas
 * y decide qué se ve de cada una.
 *
 * Tareas, alertas y localizaciones son reales. Cada fuente falla **por separado**: que fallen las
 * localizaciones o las alertas no esconde el trabajo pendiente.
 *
 * Las cifras de vencidas y de hoy las cuenta el API con la fecha de referencia (`today`): el servidor
 * no sabe qué día es para quien pregunta, y «vencida» es una comparación contra ese día.
 */
export function useDashboard() {
  const today = useReferenceDate()
  const { list: listLocations } = useLocations()

  const overdueTasks = ref<Task[]>([])
  const overdueTotal = ref(0)
  const todayTasks = ref<Task[]>([])
  const todayTotal = ref(0)
  const upcoming = ref<Task[]>([])
  const alerts = ref<Alert[]>([])
  const openAlertTotal = ref(0)
  const criticalAlertTotal = ref(0)
  const alertsError = ref<string | null>(null)
  const zones = ref<LocationSummary[]>([])
  const zonesError = ref<string | null>(null)
  const loading = ref(true)

  async function loadZones() {
    zonesError.value = null
    const result = await listLocations({ root: true, sort: 'name' })
    if (!result.success) {
      zonesError.value = result.error!.message
      return
    }
    zones.value = result.data!.content
  }

  /**
   * Las abiertas más graves (el orden por defecto de la bandeja) y dos cifras: cuántas hay y cuántas
   * son críticas. Una fila basta para contar las críticas.
   */
  async function loadAlerts() {
    alertsError.value = null
    const [open, critical] = await Promise.all([
      alertsApiService.list({ status: OPEN_ALERTS, size: ALERTS_LIMIT }),
      alertsApiService.list({ status: OPEN_ALERTS, severity: ['critica'], size: 1 }),
    ])
    if (!open.success) {
      alertsError.value = open.error!.message
      return
    }
    alerts.value = open.data!.content
    openAlertTotal.value = open.data!.totalElements
    criticalAlertTotal.value = critical.success ? critical.data!.totalElements : 0
  }

  async function load() {
    loading.value = true
    const base = { today: today.value, status: ['pendiente'], sort: 'due,asc' }
    const [overdueResult, todayResult, upcomingResult] = await Promise.all([
      tasksApiService.list({ ...base, due: 'overdue', size: COUNT_SIZE }),
      tasksApiService.list({ ...base, due: 'today', size: COUNT_SIZE }),
      // Lo que cae desde hoy en adelante: el periodo se solapa con [hoy, ∞).
      tasksApiService.list({ ...base, from: today.value, size: AGENDA_LIMIT }),
      loadAlerts(),
      loadZones(),
    ])
    loading.value = false

    if (overdueResult.success) {
      overdueTasks.value = overdueResult.data!.content
      overdueTotal.value = overdueResult.data!.totalElements
    }
    if (todayResult.success) {
      todayTasks.value = todayResult.data!.content
      todayTotal.value = todayResult.data!.totalElements
    }
    if (upcomingResult.success) upcoming.value = upcomingResult.data!.content
  }

  const daysAgo = (due: string) =>
    Math.round((Date.parse(`${today.value}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / MS_PER_DAY)

  const overdueOverAWeek = computed(() => overdueTasks.value.filter((task) => daysAgo(task.dueTo) > 7).length)
  /** Las de hoy que son un periodo y no un día exacto: no hay hora, hay margen. */
  const periodToday = computed(() => todayTasks.value.filter((task) => task.dueFrom !== task.dueTo).length)
  const criticalAlerts = computed(() => criticalAlertTotal.value)

  /** «Jueves, 3 de septiembre», de la fecha de referencia. */
  const dateLabel = computed(() => {
    const text = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date(`${today.value}T00:00:00Z`))
    return text.charAt(0).toUpperCase() + text.slice(1)
  })

  // El Dashboard enseña el siguiente trabajo desde hoy. Lo vencido tiene su resumen propio y se
  // resuelve en la vista completa de Tareas, donde sí se agrupa por urgencia.
  const agenda = computed(() => upcoming.value.map((task) => ({
    id: task.id, due: agendaDue(task, today.value), title: task.title, task,
  })))

  const alertsToShow = computed(() => alerts.value)

  /** Las zonas más cargadas, y la mayor como escala de las barras. */
  const busiestZones = computed(() => [...zones.value]
    .sort((a, b) => b.plantCountTotal - a.plantCountTotal)
    .slice(0, ZONES_LIMIT))
  const maxZoneLoad = computed(() => Math.max(1, ...zones.value.map((zone) => zone.plantCountTotal)))

  return {
    today, load, loadZones, loading, zonesError,
    overdueCount: computed(() => overdueTotal.value),
    todayCount: computed(() => todayTotal.value),
    openAlertCount: computed(() => openAlertTotal.value),
    alertsError, loadAlerts,
    overdueOverAWeek, periodToday, criticalAlerts,
    timing: (task: Task) => taskTiming(task, today.value),
    dateLabel, agenda, alertsToShow, busiestZones, maxZoneLoad,
  }
}
