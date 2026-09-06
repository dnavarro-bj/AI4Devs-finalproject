import { getApiClient } from '@shared/services/httpClient'
import { normalizeError } from '@shared/services/errorNormalizer'
import { ok, fail, type PageResponse, type ServiceResponse } from '@shared/types/api.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'
import type { Location } from '../types/catalog.types'

/**
 * Los catálogos que pueblan el formulario de alta.
 *
 * `GET /species` devuelve el **resumen**: los rangos están solo en `GET /species/{id}`, así que
 * la ficha se pide al seleccionarse una especie y no antes.
 */
export const catalogsApiService = {
  async listLocations(): Promise<ServiceResponse<PageResponse<Location>>> {
    try {
      return ok(await getApiClient().get<PageResponse<Location>>('/locations'))
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
