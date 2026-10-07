import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { Alert, AlertInput, AlertListQuery, AlertTransitionAction, AlertsApi } from '../types/alert.types'

/**
 * Las alertas, contra el API (`alertas-con-ciclo-de-vida`).
 *
 * Habla con el backend y nada más: sin `loading`, sin estado de UI y sin lanzar nunca —el fallo va
 * en la firma como `ServiceResponse` (ADR-015)—. El listado se consume como `PageResponse`
 * (ADR-009). Los criterios ausentes no viajan: un `sort` vacío taparía el orden de la bandeja.
 */
export const alertsApiService: AlertsApi = {
  list(query: AlertListQuery = {}): Promise<ServiceResponse<PageResponse<Alert>>> {
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.size) params.size = query.size
    if (query.sort) params.sort = query.sort
    if (query.status?.length) params.status = query.status
    if (query.severity?.length) params.severity = query.severity
    if (query.source) params.source = query.source
    if (query.category) params.category = query.category
    if (query.plant) params.plant = query.plant
    if (query.location) params.location = query.location
    if (query.location && query.includeDescendants) params.includeDescendants = true

    return call(() => getApiClient().get<PageResponse<Alert>>('/alerts', params))
  },

  detail(id: string): Promise<ServiceResponse<Alert>> {
    return call(() => getApiClient().get<Alert>(`/alerts/${id}`))
  },

  /** Los campos vacíos no viajan: una acción recomendada en blanco es «sin acción». */
  create(input: AlertInput): Promise<ServiceResponse<Alert>> {
    const body: Record<string, unknown> = {
      category: input.category,
      severity: input.severity,
      reason: input.reason.trim(),
    }
    if (input.plantId) body.plantId = input.plantId
    if (input.locationId) body.locationId = input.locationId
    if (input.recommendedAction?.trim()) body.recommendedAction = input.recommendedAction.trim()

    return call(() => getApiClient().post<Alert>('/alerts', body))
  },

  /** Revisar, resolver o descartar: tres rutas, un mismo cuerpo con el comentario opcional. */
  transition(id: string, action: AlertTransitionAction, comment?: string): Promise<ServiceResponse<Alert>> {
    return call(() => getApiClient().post<Alert>(`/alerts/${id}/${action}`, comment?.trim() ? { comment: comment.trim() } : {}))
  },
}

async function call<T>(request: () => Promise<T>): Promise<ServiceResponse<T>> {
  try {
    return ok(await request())
  } catch (cause) {
    return fail(normalizeError(cause))
  }
}
