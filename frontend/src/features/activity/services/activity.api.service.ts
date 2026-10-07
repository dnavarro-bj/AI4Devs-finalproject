import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { ActivityApi, ActivityEntry, ActivityQuery } from '../types/activity.types'

/**
 * La actividad reciente, contra el API (`dashboard-operativo`).
 *
 * Habla con el backend y nada más: sin estado de UI y sin lanzar nunca —el fallo va en la firma—
 * (ADR-015). Se consume como `PageResponse` (ADR-009) y los criterios ausentes no viajan.
 */
export const activityApiService: ActivityApi = {
  async list(query: ActivityQuery = {}): Promise<ServiceResponse<PageResponse<ActivityEntry>>> {
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.size) params.size = query.size

    try {
      return ok(await getApiClient().get<PageResponse<ActivityEntry>>('/activity', params))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}
