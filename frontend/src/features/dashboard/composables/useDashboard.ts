import { computed, ref } from 'vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { isOpen, type Alert } from '@features/alerts/types/alert.types'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import type { Task } from '@features/tasks/types/task.types'

const AGENDA_LIMIT = 3
const ALERTS_LIMIT = 3
const ZONES_LIMIT = 3
const MS_PER_DAY = 86_400_000

/**
 * El caso de uso del Dashboard: reúne tareas, alertas y localizaciones **sin duplicar** sus cargas
 * y decide qué se ve de cada una.
 *
 * Tareas y alertas son de ejemplo (T-22, T-23); las localizaciones son reales. Cada fuente falla
 * **por separado**: que fallen las localizaciones no esconde el trabajo pendiente.
 */
export function useDashboard() {
  const today = useReferenceDate()
  const { list: listLocations } = useLocations()

  const tasks = ref<Task[]>([])
  const alerts = ref<Alert[]>([])
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

  async function load() {
    loading.value = true
    const [taskResult, alertResult] = await Promise.all([
      tasksApiService.list(),
      alertsApiService.list(),
      loadZones(),
    ])
    loading.value = false

    if (taskResult.success) tasks.value = taskResult.data!
    if (alertResult.success) alerts.value = alertResult.data!
  }

  const pending = computed(() => tasks.value.filter((task) => task.status === 'pending'))
  const overdue = computed(() => pending.value.filter((task) => task.due < today.value))
  const dueToday = computed(() => pending.value.filter((task) => task.due === today.value))
  const openAlerts = computed(() => alerts.value.filter((alert) => isOpen(alert.state)))

  const daysAgo = (due: string) =>
    Math.round((Date.parse(`${today.value}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / MS_PER_DAY)

  const overdueOverAWeek = computed(() => overdue.value.filter((task) => daysAgo(task.due) > 7).length)
  const flexibleToday = computed(() => dueToday.value.filter((task) => task.time === null).length)
  const criticalAlerts = computed(() => openAlerts.value.filter((alert) => alert.severity === 'critical').length)

  /** «Jueves, 3 de septiembre», de la fecha de referencia. */
  const dateLabel = computed(() => {
    const text = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
    }).format(new Date(`${today.value}T00:00:00Z`))
    return text.charAt(0).toUpperCase() + text.slice(1)
  })

  // El Dashboard enseña el siguiente trabajo desde hoy. Lo vencido tiene su resumen propio y se
  // resuelve en la vista completa de Tareas, donde sí se agrupa por urgencia.
  const agenda = computed(() => pending.value
    .filter((task) => task.due >= today.value)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, AGENDA_LIMIT)
    .map((task) => ({ id: task.id, due: task.due, title: task.title, task })))

  const alertsToShow = computed(() => openAlerts.value.slice(0, ALERTS_LIMIT))

  /** Las zonas más cargadas, y la mayor como escala de las barras. */
  const busiestZones = computed(() => [...zones.value]
    .sort((a, b) => b.plantCountTotal - a.plantCountTotal)
    .slice(0, ZONES_LIMIT))
  const maxZoneLoad = computed(() => Math.max(1, ...zones.value.map((zone) => zone.plantCountTotal)))

  return {
    today, load, loadZones, loading, zonesError,
    overdueCount: computed(() => overdue.value.length),
    todayCount: computed(() => dueToday.value.length),
    openAlertCount: computed(() => openAlerts.value.length),
    overdueOverAWeek, flexibleToday, criticalAlerts,
    dateLabel, agenda, alertsToShow, busiestZones, maxZoneLoad,
  }
}
