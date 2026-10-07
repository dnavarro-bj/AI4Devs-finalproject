import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type {
  Task,
  TaskCompletionInput,
  TaskInput,
  TaskListQuery,
  TaskScheduleInput,
  TaskScopePlant,
  TasksApi,
} from '../types/task.types'

/**
 * Las tareas, contra el API (`tareas-modelo-y-api`).
 *
 * Habla con el backend y nada más: sin `loading`, sin estado de UI y sin lanzar nunca —el fallo va
 * en la firma como `ServiceResponse` (ADR-015)—. Los listados se consumen como `PageResponse`
 * (ADR-009). Los criterios ausentes no viajan: un `sort` vacío taparía el orden por defecto.
 */
export const tasksHttpService: TasksApi = {
  async list(query: TaskListQuery = {}): Promise<ServiceResponse<PageResponse<Task>>> {
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.size) params.size = query.size
    if (query.sort) params.sort = query.sort
    if (query.status?.length) params.status = query.status
    if (query.type?.length) params.type = query.type
    if (query.priority?.length) params.priority = query.priority
    // Un texto en blanco no es un filtro: no viaja.
    if (query.q?.trim()) params.q = query.q.trim()
    if (query.from) params.from = query.from
    if (query.to) params.to = query.to
    if (query.due) params.due = query.due
    if (query.today) params.today = query.today
    if (query.location) params.location = query.location
    if (query.location && query.includeDescendants) params.includeDescendants = true
    if (query.plant) params.plant = query.plant
    if (query.species) params.species = query.species

    return call(() => getApiClient().get<PageResponse<Task>>('/tasks', params))
  },

  detail(id: string): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().get<Task>(`/tasks/${id}`))
  },

  create(input: TaskInput): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().post<Task>('/tasks', input))
  },

  /** Reemplazo completo de una tarea **pendiente**. */
  update(id: string, input: TaskInput): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().put<Task>(`/tasks/${id}`, input))
  },

  schedule(id: string, input: TaskScheduleInput): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().put<Task>(`/tasks/${id}/schedule`, input))
  },

  /** Las plantas que la tarea afectaría **ahora**, paginadas: es lo que el diálogo de completar enseña. */
  scope(id: string, page = 0, size = 50): Promise<ServiceResponse<PageResponse<TaskScopePlant>>> {
    return call(() => getApiClient().get<PageResponse<TaskScopePlant>>(`/tasks/${id}/scope`, { page, size }))
  },

  /** Solo viajan las exclusiones: la lista de incluidas la calcula el servidor al completar. */
  complete(id: string, input: TaskCompletionInput): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().post<Task>(`/tasks/${id}/complete`, input))
  },

  skip(id: string, reason?: string): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().post<Task>(`/tasks/${id}/skip`, reason ? { reason } : {}))
  },

  cancel(id: string, reason?: string): Promise<ServiceResponse<Task>> {
    return call(() => getApiClient().post<Task>(`/tasks/${id}/cancel`, reason ? { reason } : {}))
  },
}

async function call<T>(request: () => Promise<T>): Promise<ServiceResponse<T>> {
  try {
    return ok(await request())
  } catch (cause) {
    return fail(normalizeError(cause))
  }
}

/** Lo que consumen los composables: el service contra el API. */
export const tasksApiService: TasksApi = tasksHttpService
