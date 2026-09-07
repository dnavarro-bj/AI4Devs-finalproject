import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import { speciesApiService } from '../services/species.api.service'
import type { SpeciesCare, SpeciesInput, SpeciesSummary } from '../types/species.types'

/**
 * Los casos de uso del catálogo de especies.
 *
 * Sin store: el catálogo no es estado global entre features. La caché de fichas que necesita el
 * alta de planta ya vive en `useCatalogs`, y duplicarla aquí daría dos fuentes para el mismo dato.
 */
export function useSpecies() {
  const list = (page = 0, sort?: string): Promise<ServiceResponse<PageResponse<SpeciesSummary>>> =>
    speciesApiService.list(page, sort)

  const detail = (id: string): Promise<ServiceResponse<SpeciesCare>> => speciesApiService.detail(id)

  const create = (input: SpeciesInput): Promise<ServiceResponse<SpeciesCare>> => speciesApiService.create(input)

  const update = (id: string, input: SpeciesInput): Promise<ServiceResponse<SpeciesCare>> =>
    speciesApiService.update(id, input)

  const remove = (id: string): Promise<ServiceResponse<null>> => speciesApiService.remove(id)

  return { list, detail, create, update, remove }
}
