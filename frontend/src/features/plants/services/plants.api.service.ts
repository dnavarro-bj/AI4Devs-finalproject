import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { PlantDetail, PlantSummary } from '../types/plant.types'

/**
 * El inventario.
 *
 * Los listados se consumen siempre como `PageResponse`, nunca como array plano, y el cliente
 * **no fija `size`**: deja el tamaño por defecto del servidor en lugar de duplicar una
 * configuración que vive en `application.yml`.
 *
 * Ningún método lanza: el fallo sale en el `ServiceResponse` (ADR-015).
 */
export const plantsApiService = {
  async list(page = 0): Promise<ServiceResponse<PageResponse<PlantSummary>>> {
    try {
      return ok(await getApiClient().get<PageResponse<PlantSummary>>('/plants', { page }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async detail(id: string): Promise<ServiceResponse<PlantDetail>> {
    try {
      return ok(await getApiClient().get<PlantDetail>(`/plants/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(nickname: string, locationId: string, speciesId: string): Promise<ServiceResponse<PlantDetail>> {
    try {
      return ok(await getApiClient().post<PlantDetail>('/plants', { nickname, locationId, speciesId }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}
