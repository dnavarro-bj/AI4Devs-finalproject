import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { PlantDetail, PlantProfile, PlantStatus, PlantStatusChange, PlantSummary } from '../types/plant.types'

/**
 * El inventario.
 *
 * Los listados se consumen siempre como `PageResponse`, nunca como array plano, y el cliente
 * **no fija `size`**: deja el tamaño por defecto del servidor en lugar de duplicar una
 * configuración que vive en `application.yml`.
 *
 * Ningún método lanza: el fallo sale en el `ServiceResponse` (ADR-015).
 */
/**
 * Los filtros combinables que el API admite: `tag` repetible con semántica AND y, desde
 * `filtros-y-orden-del-inventario`, el resto con la convención de ADR-016 —repetible es «cualquiera
 * de los valores»—. `sort` es una clave pública (`code`, `nickname`, `species`, `location`,
 * `createdAt`), no una propiedad de la entidad.
 */
export interface PlantQuery {
  page?: number
  /** `campo,asc` o `campo,desc`, tal como lo espera Spring Data. */
  sort?: string
  tag?: string[]
  location?: string
  /** Con `location`, añade las plantas de todas las sublocalizaciones a cualquier profundidad. */
  includeDescendants?: boolean
  /** Coincidencia parcial sobre el código de inventario, sin distinguir mayúsculas. */
  code?: string
  /**
   * Los estados que se quieren, repetibles. Sin ninguno, el API devuelve solo lo que está en curso:
   * lo archivado no se mezcla con lo activo.
   */
  status?: string[]
  /**
   * Búsqueda de texto sobre código, apodo y nombre —científico y común— de la especie, parcial y
   * sin distinguir mayúsculas.
   */
  q?: string
  /** Identificadores de especie, repetibles: encaja el ejemplar de cualquiera de ellas. */
  species?: string[]
  /** Exposición solar **de la especie** del ejemplar, repetible. */
  exposure?: string[]
  /** Entorno **de la especie** del ejemplar, repetible. */
  environment?: string[]
  /** Solo para quien necesita más de una página (el selector de especie); por defecto, el del servidor. */
  size?: number
}

export const plantsApiService = {
  async list(query: PlantQuery = {}): Promise<ServiceResponse<PageResponse<PlantSummary>>> {
    // Los criterios ausentes no viajan: un `sort` vacío tapa el orden por defecto del servidor.
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.sort) params.sort = query.sort
    if (query.tag?.length) params.tag = query.tag
    if (query.location) params.location = query.location
    if (query.location && query.includeDescendants) params.includeDescendants = true
    // Un texto en blanco no es un filtro: no viaja.
    if (query.code?.trim()) params.code = query.code.trim()
    if (query.status?.length) params.status = query.status
    if (query.q?.trim()) params.q = query.q.trim()
    if (query.species?.length) params.species = query.species
    if (query.exposure?.length) params.exposure = query.exposure
    if (query.environment?.length) params.environment = query.environment
    if (query.size) params.size = query.size

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

  /**
   * El alta, con la ficha opcional y el estado inicial —que solo se elige aquí, y de entre los que
   * están en curso—. Lo ausente no viaja.
   */
  async create(
    nickname: string,
    locationId: string,
    speciesId: string,
    profile: PlantProfile = {},
    status?: PlantStatus,
  ): Promise<ServiceResponse<PlantDetail>> {
    try {
      return ok(await getApiClient().post<PlantDetail>('/plants', {
        nickname, locationId, speciesId, ...present(profile), ...(status ? { status } : {}),
      }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /**
   * Reemplazo completo de la ficha —apodo, localización, especie y lo opcional—, como
   * `PUT /species/{id}`: el cuerpo es la planta entera, no un parche, y **nunca lleva el estado**,
   * que tiene su propia operación porque deja rastro. Los tags también tienen su endpoint.
   */
  async update(
    id: string,
    nickname: string,
    locationId: string,
    speciesId: string,
    profile: PlantProfile = {},
  ): Promise<ServiceResponse<PlantDetail>> {
    try {
      return ok(await getApiClient().put<PlantDetail>(`/plants/${id}`, {
        nickname, locationId, speciesId, ...present(profile),
      }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /**
   * Cambia el estado y deja constancia. El motivo es opcional salvo al volver a `activa` desde un
   * estado final; si falta, no viaja. Una transición no permitida es un `409` con su motivo.
   */
  async changeStatus(id: string, status: PlantStatus, reason?: string): Promise<ServiceResponse<PlantDetail>> {
    try {
      const body: Record<string, unknown> = { status }
      if (reason?.trim()) body.reason = reason.trim()
      return ok(await getApiClient().put<PlantDetail>(`/plants/${id}/status`, body))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** El historial de cambios de estado, paginado, del más reciente al más antiguo. */
  async statusChanges(id: string, page = 0): Promise<ServiceResponse<PageResponse<PlantStatusChange>>> {
    try {
      return ok(await getApiClient().get<PageResponse<PlantStatusChange>>(`/plants/${id}/status-changes`, { page }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}

/** Lo ausente no viaja: un campo `null` y uno omitido significan lo mismo, y así el cuerpo es el mínimo. */
function present(profile: PlantProfile): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}
