import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { SoilMix, SoilMixDetail, SoilMixInput } from '../types/soilMix.types'

/**
 * El API del catálogo de mezclas. Habla con el backend y nada más: sin `loading`, sin estado de
 * UI y sin lanzar nunca —el fallo va en la firma como `ServiceResponse` (ADR-015)—.
 */
export const soilMixesApiService = {
  async list(page = 0, sort?: string): Promise<ServiceResponse<PageResponse<SoilMix>>> {
    try {
      const query: Record<string, unknown> = { page }
      if (sort) query.sort = sort
      return ok(await getApiClient().get<PageResponse<SoilMix>>('/soil-mixes', query))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async detail(id: string): Promise<ServiceResponse<SoilMixDetail>> {
    try {
      return ok(await getApiClient().get<SoilMixDetail>(`/soil-mixes/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(input: SoilMixInput): Promise<ServiceResponse<SoilMix>> {
    try {
      return ok(await getApiClient().post<SoilMix>('/soil-mixes', input))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async update(id: string, input: SoilMixInput): Promise<ServiceResponse<SoilMix>> {
    try {
      return ok(await getApiClient().put<SoilMix>(`/soil-mixes/${id}`, input))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Devuelve `204` sin cuerpo: lo que importa es que no haya fallado. */
  async remove(id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/soil-mixes/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}
