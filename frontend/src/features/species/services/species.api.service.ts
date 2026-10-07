import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { SpeciesCare, SpeciesDetail, SpeciesInput, SpeciesSummary } from '../types/species.types'

/**
 * Los criterios del listado del catálogo (ADR-016). `sort` es una clave pública: `code`,
 * `scientificName`, `commonName` o `exposure`.
 */
export interface SpeciesQuery {
  page?: number
  size?: number
  sort?: string
  /** Coincidencia parcial sobre el código. */
  code?: string
  /** Texto sobre nombre científico, nombre común y código. */
  q?: string
  exposure?: string[]
  environment?: string[]
  soilMix?: string[]
  /** La temperatura mínima soportada está en [from, to], extremos incluidos; cada uno es opcional. */
  minTemperatureFrom?: number
  minTemperatureTo?: number
  /** Meses 1–12: la especie crece (o florece) en **todos** los indicados. */
  growthMonth?: number[]
  bloomMonth?: number[]
}

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
  /** El listado con los criterios de siempre: orden y código. `search` es el listado completo. */
  list(page = 0, sort?: string, code?: string): Promise<ServiceResponse<PageResponse<SpeciesSummary>>> {
    return speciesApiService.search({ page, sort, code })
  },

  /**
   * El catálogo filtrado y ordenado (ADR-016). Los criterios ausentes no viajan —un `sort` vacío
   * tapa el orden por defecto— y los repetibles lo hacen como parámetros repetidos.
   */
  async search(query: SpeciesQuery = {}): Promise<ServiceResponse<PageResponse<SpeciesSummary>>> {
    const params: Record<string, unknown> = { page: query.page ?? 0 }
    if (query.size) params.size = query.size
    if (query.sort) params.sort = query.sort
    // Un texto en blanco no es un filtro.
    if (query.code?.trim()) params.code = query.code.trim()
    if (query.q?.trim()) params.q = query.q.trim()
    if (query.exposure?.length) params.exposure = query.exposure
    if (query.environment?.length) params.environment = query.environment
    if (query.soilMix?.length) params.soilMix = query.soilMix
    if (query.minTemperatureFrom !== undefined) params.minTemperatureFrom = query.minTemperatureFrom
    if (query.minTemperatureTo !== undefined) params.minTemperatureTo = query.minTemperatureTo
    if (query.growthMonth?.length) params.growthMonth = query.growthMonth
    if (query.bloomMonth?.length) params.bloomMonth = query.bloomMonth
    try {
      return ok(await getApiClient().get<PageResponse<SpeciesSummary>>('/species', params))
    } catch (cause) {
      return fail(normalizeError(cause))
    }
  },

  async detail(id: string): Promise<ServiceResponse<SpeciesDetail>> {
    try {
      return ok(await getApiClient().get<SpeciesDetail>(`/species/${id}`))
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
