import { computed, reactive, ref } from 'vue'
import { alertsApiService } from '../services/alerts.api.service'
import { isOpen, type Alert } from '../types/alert.types'

export interface AlertFilters {
  /** `open` = nueva o revisada; `all` = todas; si no, un estado concreto del ciclo de vida. */
  state: string
  severity: string
  location: string
}

/**
 * El caso de uso de la bandeja: una carga y los filtros. **Por defecto, las abiertas**: la bandeja
 * es lo que pide atención, no el archivo.
 */
export function useAlerts() {
  const alerts = ref<Alert[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const filters = reactive<AlertFilters>({ state: 'open', severity: '', location: '' })

  async function load() {
    loading.value = true
    error.value = null

    const result = await alertsApiService.list()
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    alerts.value = result.data!
  }

  const matchesState = (alert: Alert) =>
    filters.state === 'all' || (filters.state === 'open' ? isOpen(alert.state) : alert.state === filters.state)

  const visible = computed(() => alerts.value.filter((alert) =>
    matchesState(alert)
    && (!filters.severity || alert.severity === filters.severity)
    && (!filters.location || alert.location.startsWith(filters.location))))

  /** Siempre sobre **todas**: la cabecera cuenta lo abierto aunque el filtro enseñe otra cosa. */
  const openCount = computed(() => alerts.value.filter((alert) => isOpen(alert.state)).length)

  const stateOptions = [
    { value: 'open', label: 'Abiertas' },
    { value: 'new', label: 'Nuevas' },
    { value: 'reviewed', label: 'Revisadas' },
    { value: 'resolved', label: 'Resueltas' },
    { value: 'dismissed', label: 'Descartadas' },
    { value: 'all', label: 'Todas' },
  ]

  const severityOptions = [
    { value: '', label: 'Cualquier severidad' },
    { value: 'critical', label: 'Crítica' },
    { value: 'medium', label: 'Media' },
    { value: 'low', label: 'Baja' },
  ]

  const locationOptions = computed(() => [
    { value: '', label: 'Todas las localizaciones' },
    ...[...new Set(alerts.value.map((alert) => alert.location.split(' / ')[0]!))].sort()
      .map((location) => ({ value: location, label: location })),
  ])

  return {
    alerts, loading, error, filters, load, visible, openCount,
    stateOptions, severityOptions, locationOptions,
  }
}
