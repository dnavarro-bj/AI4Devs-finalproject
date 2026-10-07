import { computed, ref } from 'vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import { plural } from '@shared/utils/plural'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import type { Alert } from '@features/alerts/types/alert.types'
import { activityApiService } from '@features/activity/services/activity.api.service'
import { activityLine } from '@features/activity/mappers/activity.mapper'
import type { ActivityEntry } from '@features/activity/types/activity.types'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { agendaDue, taskTiming } from '@features/tasks/mappers/task.mapper'
import type { Task } from '@features/tasks/types/task.types'

const AGENDA_LIMIT = 3
const ALERTS_LIMIT = 3
const ZONES_LIMIT = 3
const ACTIVITY_LIMIT = 8
const OPEN_ALERTS = ['nueva', 'revisada']
/** Una página: de las vencidas y las de hoy solo hace falta contarlas y ver cuántas son de un periodo. */
const COUNT_SIZE = 500
const MS_PER_DAY = 86_400_000

/**
 * El caso de uso del Dashboard: reúne tareas, alertas y localizaciones **sin duplicar** sus cargas
 * y decide qué se ve de cada una.
 *
 * Tareas, alertas, localizaciones y actividad son reales. **Cada bloque carga en paralelo y falla por
 * separado**, con su error y su reintento: que fallen las localizaciones o la actividad no esconde el
 * trabajo pendiente.
 *
 * «Plantas sin revisar» **no se calcula aquí**: es el número de alertas abiertas de origen
 * `sin_revisar`, que ya define y detecta `alertas-con-ciclo-de-vida`. Una sola definición de
 * «revisión» y ningún segundo número para lo mismo.
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
  const tasksError = ref<string | null>(null)
  const alerts = ref<Alert[]>([])
  const openAlertTotal = ref(0)
  const criticalAlertTotal = ref(0)
  /** `null` mientras no se sabe: un 0 inventado diría «todo revisado» cuando solo falló la consulta. */
  const unreviewedTotal = ref<number | null>(null)
  const alertsError = ref<string | null>(null)
  const zones = ref<LocationSummary[]>([])
  const zonesError = ref<string | null>(null)
  const activity = ref<ActivityEntry[]>([])
  const activityError = ref<string | null>(null)
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
   * Las abiertas más graves (el orden por defecto de la bandeja) y tres cifras: cuántas hay, cuántas
   * son críticas y cuántas son de «sin revisar». Una fila basta para contar.
   */
  async function loadAlerts() {
    alertsError.value = null
    const [open, critical, unreviewed] = await Promise.all([
      alertsApiService.list({ status: OPEN_ALERTS, size: ALERTS_LIMIT }),
      alertsApiService.list({ status: OPEN_ALERTS, severity: ['critica'], size: 1 }),
      alertsApiService.list({ status: OPEN_ALERTS, source: 'sin_revisar', size: 1 }),
    ])
    if (!open.success) {
      alertsError.value = open.error!.message
      return
    }
    alerts.value = open.data!.content
    openAlertTotal.value = open.data!.totalElements
    criticalAlertTotal.value = critical.success ? critical.data!.totalElements : 0
    unreviewedTotal.value = unreviewed.success ? unreviewed.data!.totalElements : null
  }

  /** Lo que se ha hecho, del más reciente al más antiguo: los lotes ya vienen colapsados en una entrada. */
  async function loadActivity() {
    activityError.value = null
    const result = await activityApiService.list({ size: ACTIVITY_LIMIT })
    if (!result.success) {
      activityError.value = result.error!.message
      return
    }
    activity.value = result.data!.content
  }

  /** Vencidas, de hoy y lo que viene: tres peticiones de un mismo bloque, que falla —y reintenta— junto. */
  async function loadTasks() {
    tasksError.value = null
    const base = { today: today.value, status: ['pendiente'], sort: 'due,asc' }
    const [overdueResult, todayResult, upcomingResult] = await Promise.all([
      tasksApiService.list({ ...base, due: 'overdue', size: COUNT_SIZE }),
      tasksApiService.list({ ...base, due: 'today', size: COUNT_SIZE }),
      // Lo que cae desde hoy en adelante: el periodo se solapa con [hoy, ∞).
      tasksApiService.list({ ...base, from: today.value, size: AGENDA_LIMIT }),
    ])

    const failed = [overdueResult, todayResult, upcomingResult].find((result) => !result.success)
    if (failed) tasksError.value = failed.error!.message

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

  async function load() {
    loading.value = true
    await Promise.all([loadTasks(), loadAlerts(), loadZones(), loadActivity()])
    loading.value = false
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

  /**
   * Las zonas más cargadas, con lo que cada una tiene pendiente: sus plantas, sus tareas y sus
   * alertas abiertas. Una localización sin recuento de tareas o de alertas cuenta cero.
   */
  const busiestZones = computed(() => [...zones.value]
    .sort((a, b) => b.plantCountTotal - a.plantCountTotal)
    .slice(0, ZONES_LIMIT)
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      plantCountTotal: zone.plantCountTotal,
      summary: [
        plural(zone.plantCountTotal, 'planta', 'plantas'),
        plural(zone.pendingTasks ?? 0, 'tarea', 'tareas'),
        plural(zone.openAlerts?.count ?? 0, 'alerta', 'alertas'),
      ].join(' · '),
    })))
  const maxZoneLoad = computed(() => Math.max(1, ...zones.value.map((zone) => zone.plantCountTotal)))

  const activityItems = computed(() => activity.value.map((entry) => activityLine(entry, today.value)))

  return {
    today, load, loadZones, loading, zonesError,
    overdueCount: computed(() => overdueTotal.value),
    todayCount: computed(() => todayTotal.value),
    openAlertCount: computed(() => openAlertTotal.value),
    unreviewedCount: computed(() => unreviewedTotal.value),
    alertsError, loadAlerts, tasksError, loadTasks, activityItems, activityError, loadActivity,
    overdueOverAWeek, periodToday, criticalAlerts,
    timing: (task: Task) => taskTiming(task, today.value),
    dateLabel, agenda, alertsToShow, busiestZones, maxZoneLoad,
  }
}
