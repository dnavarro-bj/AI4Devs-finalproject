import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'
import type {
  Location,
  LocationDetail,
  LocationListItem,
  Tag,
  TagDetail,
  TagListItem,
  TagMergeResult,
} from '../types/catalog.types'

/**
 * Los catálogos que pueblan el formulario de alta, más el catálogo de localizaciones completo:
 * su ficha, su alta, la corrección del nombre y la retirada.
 *
 * `GET /species` devuelve el **resumen**: los rangos están solo en `GET /species/{id}`, así que
 * la ficha se pide al seleccionarse una especie y no antes.
 *
 * Habla con el backend y nada más: sin `loading`, sin estado de UI y sin lanzar nunca —el fallo
 * va en la firma como `ServiceResponse` (ADR-015)—.
 */
export const catalogsApiService = {
  async listLocations(page = 0, sort?: string): Promise<ServiceResponse<PageResponse<LocationListItem>>> {
    try {
      const query: Record<string, unknown> = { page }
      if (sort) query.sort = sort
      return ok(await getApiClient().get<PageResponse<LocationListItem>>('/locations', query))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** La ficha, que es la única que trae el recuento de ejemplares. */
  async locationDetail(id: string): Promise<ServiceResponse<LocationDetail>> {
    try {
      return ok(await getApiClient().get<LocationDetail>(`/locations/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async createLocation(name: string): Promise<ServiceResponse<Location>> {
    try {
      return ok(await getApiClient().post<Location>('/locations', { name }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Corregir una localización es cambiarle el nombre, que es todo lo que tiene hasta T-18. */
  async renameLocation(id: string, name: string): Promise<ServiceResponse<Location>> {
    try {
      return ok(await getApiClient().put<Location>(`/locations/${id}`, { name }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Devuelve `204` sin cuerpo: lo que importa es que no haya fallado. */
  async removeLocation(id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/locations/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async listTags(page = 0, sort?: string): Promise<ServiceResponse<PageResponse<TagListItem>>> {
    try {
      const query: Record<string, unknown> = { page }
      if (sort) query.sort = sort
      return ok(await getApiClient().get<PageResponse<TagListItem>>('/tags', query))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** La ficha, que es la única que trae el nombre normalizado. */
  async tagDetail(id: string): Promise<ServiceResponse<TagDetail>> {
    try {
      return ok(await getApiClient().get<TagDetail>(`/tags/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async createTag(name: string): Promise<ServiceResponse<Tag>> {
    try {
      return ok(await getApiClient().post<Tag>('/tags', { name }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async renameTag(id: string, name: string): Promise<ServiceResponse<Tag>> {
    try {
      return ok(await getApiClient().put<Tag>(`/tags/${id}`, { name }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /**
   * Combina la etiqueta de origen en la de destino. La respuesta dice a cuántas plantas alcanzó:
   * la operación es destructiva, así que el alcance se confirma después y no solo se promete antes.
   */
  async mergeTags(sourceId: string, targetId: string): Promise<ServiceResponse<TagMergeResult>> {
    try {
      return ok(await getApiClient().post<TagMergeResult>(`/tags/${sourceId}/merge`, { targetId }))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Devuelve `204` sin cuerpo: lo que importa es que no haya fallado. */
  async removeTag(id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/tags/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async listSpecies(): Promise<ServiceResponse<PageResponse<SpeciesSummary>>> {
    try {
      return ok(await getApiClient().get<PageResponse<SpeciesSummary>>('/species'))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async speciesCare(id: string): Promise<ServiceResponse<SpeciesCare>> {
    try {
      return ok(await getApiClient().get<SpeciesCare>(`/species/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}
