import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { SpeciesCare, SpeciesInput, SpeciesSummary } from '../types/species.types'

/**
 * El API del catálogo de especies, completo.
 *
 * Nace aquí y no en `catalogs` porque las especies dejan de ser «un catálogo que puebla un
 * selector» para ser un dominio con su CRUD. `catalogsApiService` conserva `listSpecies` y
 * `speciesCare` mientras el alta de planta los use: moverlos tocaría `PlantForm` sin necesidad.
 *
 * Como todo service: habla con el API y nada más, y nunca lanza (ADR-015).
 */
export const speciesApiService = {
  async list(page = 0, sort?: string): Promise<ServiceResponse<PageResponse<SpeciesSummary>>> {
    try {
      const query: Record<string, unknown> = { page }
      if (sort) query.sort = sort
      return ok(await getApiClient().get<PageResponse<SpeciesSummary>>('/species', query))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async detail(id: string): Promise<ServiceResponse<SpeciesCare>> {
    try {
      return ok(await getApiClient().get<SpeciesCare>(`/species/${id}`))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async create(input: SpeciesInput): Promise<ServiceResponse<SpeciesCare>> {
    try {
      return ok(await getApiClient().post<SpeciesCare>('/species', input))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Reemplazo completo: por eso el cuerpo incluye la mezcla, aunque no se haya tocado. */
  async update(id: string, input: SpeciesInput): Promise<ServiceResponse<SpeciesCare>> {
    try {
      return ok(await getApiClient().put<SpeciesCare>(`/species/${id}`, input))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  /** Devuelve `204` sin cuerpo. `409` si la especie tiene ejemplares. */
  async remove(id: string): Promise<ServiceResponse<null>> {
    try {
      await getApiClient().delete(`/species/${id}`)
      return ok(null)
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },
}
