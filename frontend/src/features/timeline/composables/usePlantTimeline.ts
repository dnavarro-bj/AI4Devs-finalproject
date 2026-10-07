import { computed, ref } from 'vue'
import type { ServiceResponse } from '@shared/types/api.types'
import { timelineApiService } from '../services/timeline.api.service'
import type { EventInput, EventResource, TimelineEntry } from '../types/timeline.types'

/**
 * El caso de uso de la cronología de la ficha: las entradas, el filtro, la página y las
 * operaciones de anotar, corregir y retirar. No hace HTTP directo (ADR-015).
 *
 * **El filtro lo aplica el servidor.** Con paginación, filtrar lo cargado diría «no hay» donde sí
 * hay en la página siguiente; por eso cambiar el filtro vuelve a la primera página y «cargar más»
 * pide la siguiente **con el mismo filtro**.
 *
 * **Los eventos que se crean aquí vuelven ya montados** y se colocan por instante, solo si encajan
 * en el filtro. Lo que escriben otras pantallas (una lectura, un cambio de estado) no es una
 * entrada de cronología, y reconstruirla en el cliente duplicaría lo que el servidor ya sabe:
 * esas llaman a `reload()`, que repite la primera página con el filtro vigente.
 */
/** Del más reciente al más antiguo; con el mismo instante, el identificador mayor primero. */
function newestFirst(a: TimelineEntry, b: TimelineEntry): number {
  const byTime = Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  if (byTime !== 0) return byTime
  return a.id.length === b.id.length ? (a.id < b.id ? 1 : -1) : b.id.length - a.id.length
}

/** Cuántas entradas se piden de una vez: la ficha enseña las últimas y sigue cargando al hacer scroll. */
export const TIMELINE_PAGE_SIZE = 10

export function usePlantTimeline(plantId: string) {
  const entries = ref<TimelineEntry[]>([])
  const filter = ref<string | null>(null)
  const total = ref(0)
  const page = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)

  /** Una respuesta tardía de un filtro anterior no debe pisar la del actual. */
  let ticket = 0

  const hasMore = computed(() => page.value + 1 < totalPages.value)
  const types = () => (filter.value ? [filter.value] : [])

  async function fetchFirst(showLoading: boolean) {
    const mine = ++ticket
    if (showLoading) loading.value = true
    error.value = null

    const result = await timelineApiService.list(plantId, { types: types(), page: 0, size: TIMELINE_PAGE_SIZE })
    if (mine !== ticket) return
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    entries.value = result.data?.content ?? []
    total.value = result.data?.totalElements ?? entries.value.length
    totalPages.value = result.data?.totalPages ?? 1
    page.value = 0
  }

  const load = () => fetchFirst(true)
  /** Sin estado de carga: la lista que hay se queda hasta que llegue la nueva. */
  const reload = () => fetchFirst(false)

  async function setFilter(type: string | null) {
    filter.value = type
    await load()
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value) return
    const mine = ticket
    loadingMore.value = true

    const result = await timelineApiService.list(plantId, { types: types(), page: page.value + 1, size: TIMELINE_PAGE_SIZE })
    loadingMore.value = false
    if (mine !== ticket) return

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    const known = new Set(entries.value.map((entry) => entry.id))
    entries.value = [...entries.value, ...(result.data?.content ?? []).filter((entry) => !known.has(entry.id))]
    total.value = result.data?.totalElements ?? total.value
    totalPages.value = result.data?.totalPages ?? totalPages.value
    page.value += 1
  }

  const matchesFilter = (entry: TimelineEntry) => !filter.value || entry.type === filter.value

  /** Crea, o corrige si se da `id`. Devuelve el resultado: el diálogo decide qué hacer con un error. */
  async function save(resource: EventResource, input: EventInput, id?: string): Promise<ServiceResponse<TimelineEntry>> {
    const result = id
      ? await timelineApiService.update(plantId, resource, id, input)
      : await timelineApiService.create(plantId, resource, input)
    if (!result.success) return result

    const saved = result.data!
    const rest = entries.value.filter((entry) => entry.id !== saved.id)
    const existed = rest.length !== entries.value.length
    if (matchesFilter(saved)) {
      entries.value = [...rest, saved].sort(newestFirst)
      if (!existed) total.value += 1
    } else if (existed) {
      entries.value = rest
      total.value -= 1
    }
    return result
  }

  async function remove(resource: EventResource, id: string): Promise<ServiceResponse<null>> {
    const result = await timelineApiService.remove(plantId, resource, id)
    if (result.success && entries.value.some((entry) => entry.id === id)) {
      entries.value = entries.value.filter((entry) => entry.id !== id)
      total.value -= 1
    }
    return result
  }

  return { entries, filter, total, loading, loadingMore, error, hasMore, load, reload, setFilter, loadMore, save, remove }
}
