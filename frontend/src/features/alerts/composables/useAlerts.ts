import { computed, reactive, ref, watch } from 'vue'
import { useLocations } from '@features/locations/composables/useLocations'
import type { LocationSummary } from '@features/locations/types/location.types'
import { alertsApiService } from '../services/alerts.api.service'
import {
  ALERT_SEVERITIES,
  ALERT_SEVERITY_LABELS,
  ALERT_SOURCES,
  ALERT_SOURCE_LABELS,
  ALERT_STATUSES,
  ALERT_STATUS_LABELS,
  type Alert,
} from '../types/alert.types'

export const ALERTS_PAGE_SIZE = 20

export interface AlertFilters {
  /** `open` = nueva o revisada; `all` = todas; si no, un estado concreto del ciclo de vida. */
  state: string
  severity: string
  source: string
  /** Una localización; con ella se piden también las de sus descendientes. */
  location: string
}

/** Lo que llega ya fijado desde otra pantalla: la ficha de un ejemplar o de una localización. */
export interface AlertScope {
  plant?: string
  location?: string
}

const OPEN = ['nueva', 'revisada']

/**
 * El caso de uso de la bandeja: los filtros **viajan al servidor** y la lista se pagina. Con
 * paginación, filtrar lo ya cargado diría «no hay» donde sí hay en la página siguiente.
 *
 * **Por defecto, las abiertas**: la bandeja es lo que pide atención, no el archivo. El recuento de la
 * cabecera es siempre el de las abiertas —con otro filtro puesto se pide aparte—.
 */
export function useAlerts(scope: AlertScope = {}) {
  const alerts = ref<Alert[]>([])
  const total = ref(0)
  const page = ref(0)
  const totalPages = ref(0)
  const loading = ref(true)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const openTotal = ref(0)
  const filters = reactive<AlertFilters>({ state: 'open', severity: '', source: '', location: scope.location ?? '' })

  const locations = ref<LocationSummary[]>([])
  const { loadAll } = useLocations()

  /** Una respuesta tardía de un filtro anterior no debe pisar la del actual. */
  let ticket = 0

  const statusCriteria = () => (filters.state === 'open' ? OPEN : filters.state === 'all' ? [] : [filters.state])

  function criteria(extra: { page?: number, size?: number } = {}) {
    return {
      page: extra.page ?? 0,
      size: extra.size ?? ALERTS_PAGE_SIZE,
      status: statusCriteria(),
      severity: filters.severity ? [filters.severity] : [],
      source: filters.source || undefined,
      plant: scope.plant,
      location: filters.location || undefined,
      includeDescendants: Boolean(filters.location),
    }
  }

  const isDefaultView = () => filters.state === 'open' && !filters.severity && !filters.source

  async function fetchFirst(showLoading: boolean) {
    const mine = ++ticket
    if (showLoading) loading.value = true
    error.value = null

    const [result, openResult] = await Promise.all([
      alertsApiService.list(criteria()),
      // Con otro filtro, la cabecera sigue contando lo abierto: se pide aparte, una fila basta.
      isDefaultView()
        ? Promise.resolve(null)
        : alertsApiService.list({ ...criteria({ size: 1 }), status: OPEN, severity: [], source: undefined }),
    ])
    if (mine !== ticket) return
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    alerts.value = result.data!.content
    total.value = result.data!.totalElements
    totalPages.value = result.data!.totalPages
    page.value = 0
    openTotal.value = openResult ? (openResult.success ? openResult.data!.totalElements : openTotal.value) : total.value
  }

  const load = () => fetchFirst(true)
  /** Sin estado de carga: la lista que hay se queda hasta que llegue la nueva (tras una transición). */
  const reload = () => fetchFirst(false)

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) return
    const mine = ticket
    loadingMore.value = true

    const result = await alertsApiService.list(criteria({ page: page.value + 1 }))
    loadingMore.value = false
    if (mine !== ticket) return

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    const known = new Set(alerts.value.map((alert) => alert.id))
    alerts.value = [...alerts.value, ...result.data!.content.filter((alert) => !known.has(alert.id))]
    total.value = result.data!.totalElements
    totalPages.value = result.data!.totalPages
    page.value += 1
  }

  const hasMore = computed(() => page.value + 1 < totalPages.value)

  watch(filters, () => { void load() })

  async function loadLocations() {
    if (locations.value.length) return
    const result = await loadAll()
    if (result.success) locations.value = result.data!
  }

  const stateOptions = [
    { value: 'open', label: 'Abiertas' },
    ...ALERT_STATUSES.map((status) => ({ value: status, label: ALERT_STATUS_LABELS[status] })),
    { value: 'all', label: 'Todas' },
  ]

  const severityOptions = [
    { value: '', label: 'Cualquier severidad' },
    ...ALERT_SEVERITIES.map((severity) => ({ value: severity, label: ALERT_SEVERITY_LABELS[severity] })),
  ]

  const sourceOptions = [
    { value: '', label: 'Cualquier origen' },
    ...ALERT_SOURCES.map((source) => ({ value: source, label: ALERT_SOURCE_LABELS[source] })),
  ]

  const locationOptions = computed(() => [
    { value: '', label: 'Todas las localizaciones' },
    ...locations.value.map((location) => ({ value: location.id, label: location.path || location.name })),
  ])

  return {
    alerts, total, openTotal, loading, loadingMore, error, filters, hasMore,
    load, reload, loadMore, loadLocations,
    stateOptions, severityOptions, sourceOptions, locationOptions,
  }
}
