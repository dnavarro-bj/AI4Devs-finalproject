import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type {
  LocationDetail,
  LocationInput,
  LocationListQuery,
  LocationSummary,
  MoveResult,
  PlantMovement,
} from '../types/location.types'

/**
 * El catálogo de localizaciones, su jerarquía y los movimientos de ejemplares.
 *
 * Habla con el backend y nada más: sin `loading`, sin estado de UI y sin lanzar nunca —el fallo va
 * en la firma como `ServiceResponse` (ADR-015)—. Los listados se consumen como `PageResponse`
 * (ADR-009): el cliente no fija `size`.
 */
export const locationsApiService = {
  async list(query: LocationListQuery = {}): Promise<ServiceResponse<PageResponse<LocationSummary>>> {
    // Los criterios ausentes no viajan: un `sort` vacío taparía el orden por defecto del servidor.
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.sort) params.sort = query.sort
    if (query.parentId) params.parentId = query.parentId
    if (query.root) params.root = true
    // Un texto en blanco no es un filtro: no viaja.
    if (query.q?.trim()) params.q = query.q.trim()
    if (query.size) params.size = query.size

    try {
      return ok(await getApiClient().get<PageResponse<LocationSummary>>('/locations', params))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** La ficha: ruta de ancestros, sublocalizaciones y recuentos directo y total. */
  async detail(id: string): Promise<ServiceResponse<LocationDetail>> {
    try {
      return ok(await getApiClient().get<LocationDetail>(`/locations/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(input: LocationInput): Promise<ServiceResponse<LocationDetail>> {
    try {
      return ok(await getApiClient().post<LocationDetail>('/locations', toBody(input)))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Reemplazo completo: el cuerpo es la localización entera. Cambiar el padre la mueve con su contenido. */
  async update(id: string, input: LocationInput): Promise<ServiceResponse<LocationDetail>> {
    try {
      return ok(await getApiClient().put<LocationDetail>(`/locations/${id}`, toBody(input)))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Devuelve `204` sin cuerpo: lo que importa es que no haya fallado. */
  async remove(id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/locations/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /**
   * Mueve un lote de ejemplares al destino, atómicamente. La respuesta separa los que cambiaron de
   * sitio de los que ya estaban allí.
   */
  async move(destinationId: string, plantIds: string[]): Promise<ServiceResponse<MoveResult>> {
    try {
      return ok(await getApiClient().post<MoveResult>(`/locations/${destinationId}/movements`, { plantIds }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** El historial de una localización —como origen o destino—, del más reciente al más antiguo. */
  async movements(id: string, page = 0): Promise<ServiceResponse<PageResponse<PlantMovement>>> {
    try {
      return ok(await getApiClient().get<PageResponse<PlantMovement>>(`/locations/${id}/movements`, { page }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** El historial de un ejemplar, del más reciente al más antiguo. */
  async plantMovements(plantId: string, page = 0): Promise<ServiceResponse<PageResponse<PlantMovement>>> {
    try {
      return ok(await getApiClient().get<PageResponse<PlantMovement>>(`/plants/${plantId}/movements`, { page }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

/** Lo ausente no viaja: un campo `null` y uno omitido significan lo mismo, y así el cuerpo es el mínimo. */
function toBody(input: LocationInput): Record<string, unknown> {
  const body: Record<string, unknown> = { name: input.name.trim(), code: input.code.trim() }
  if (input.parentId) body.parentId = input.parentId
  if (input.description.trim()) body.description = input.description.trim()
  if (input.locationType) body.locationType = input.locationType
  if (input.capacity !== null) body.capacity = input.capacity
  if (input.operationalNotes.trim()) body.operationalNotes = input.operationalNotes.trim()
  if (input.environment) body.environment = input.environment
  if (input.sunExposure) body.sunExposure = input.sunExposure
  return body
}
