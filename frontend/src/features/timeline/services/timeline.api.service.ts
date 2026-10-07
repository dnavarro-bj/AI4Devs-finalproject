import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { EventInput, EventResource, TimelineEntry, TimelineQuery } from '../types/timeline.types'

/**
 * La cronología del ejemplar y los tres recursos que se anotan sobre ella. Habla con el API y
 * nada más (ADR-015): sin estado de UI y sin lanzar —el fallo va en el `ServiceResponse`—.
 *
 * Crear y corregir devuelven la **entrada ya montada**, la misma forma que el listado, de modo que
 * el cliente la coloca sin otra petición.
 */
export const timelineApiService = {
  async list(plantId: string, query: TimelineQuery = {}): Promise<ServiceResponse<PageResponse<TimelineEntry>>> {
    // Lo ausente no viaja: un `size` vacío taparía el tamaño por defecto del servidor.
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.types?.length) params.type = query.types
    if (query.size) params.size = query.size

    try {
      return ok(await getApiClient().get<PageResponse<TimelineEntry>>(`/plants/${plantId}/timeline`, params))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(plantId: string, resource: EventResource, input: EventInput): Promise<ServiceResponse<TimelineEntry>> {
    try {
      return ok(await getApiClient().post<TimelineEntry>(`/plants/${plantId}/${resource}`, present(input)))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Reemplazo completo, como el resto de `PUT` del API. */
  async update(plantId: string, resource: EventResource, id: string, input: EventInput): Promise<ServiceResponse<TimelineEntry>> {
    try {
      return ok(await getApiClient().put<TimelineEntry>(`/plants/${plantId}/${resource}/${id}`, present(input)))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async remove(plantId: string, resource: EventResource, id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/plants/${plantId}/${resource}/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

/** Los campos vacíos no viajan: un dato ajeno a su tipo se rechazaría, y `''` no es «ausente». */
function present(input: EventInput): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}
