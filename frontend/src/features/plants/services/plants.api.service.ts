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
/** Los filtros combinables que el API admite (T-02): `tag` repetible con semántica AND. */
export interface PlantQuery {
  page?: number
  /** `campo,asc` o `campo,desc`, tal como lo espera Spring Data. */
  sort?: string
  tag?: string[]
  location?: string
}

export const plantsApiService = {
  async list(query: PlantQuery = {}): Promise<ServiceResponse<PageResponse<PlantSummary>>> {
    // Los criterios ausentes no viajan: un `sort` vacío tapa el orden por defecto del servidor.
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.sort) params.sort = query.sort
    if (query.tag?.length) params.tag = query.tag
    if (query.location) params.location = query.location

    try {
      return ok(await getApiClient().get<PageResponse<PlantSummary>>('/plants', params))
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
