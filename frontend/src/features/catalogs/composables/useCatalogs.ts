import type { SpeciesCare } from '@features/species/types/species.types'
import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import type {
  Location,
  LocationDetail,
  LocationListItem,
  Tag,
  TagDetail,
  TagListItem,
  TagMergeResult,
} from '../types/catalog.types'
import { catalogsApiService } from '../services/catalogs.api.service'

/**
 * Los catálogos del alta, con la ficha de especie cacheada por `id` para que volver a una ya
 * vista no repita la llamada.
 *
 * La caché va en `useState` y no en una variable de módulo: así vive con la aplicación Nuxt —se
 * comparte entre componentes y sobrevive a la navegación— en lugar de quedarse pegada al módulo
 * para siempre.
 */
export function useCatalogs() {
  const cache = useState<Record<string, SpeciesCare>>('species-care-cache', () => ({}))

  const listLocations = (page = 0, sort?: string): Promise<ServiceResponse<PageResponse<LocationListItem>>> =>
    catalogsApiService.listLocations(page, sort)

  const locationDetail = (id: string): Promise<ServiceResponse<LocationDetail>> =>
    catalogsApiService.locationDetail(id)

  const createLocation = (name: string): Promise<ServiceResponse<Location>> =>
    catalogsApiService.createLocation(name)

  const renameLocation = (id: string, name: string): Promise<ServiceResponse<Location>> =>
    catalogsApiService.renameLocation(id, name)

  const removeLocation = (id: string): Promise<ServiceResponse<null>> =>
    catalogsApiService.removeLocation(id)
  const listTags = (page = 0, sort?: string): Promise<ServiceResponse<PageResponse<TagListItem>>> =>
    catalogsApiService.listTags(page, sort)

  const tagDetail = (id: string): Promise<ServiceResponse<TagDetail>> =>
    catalogsApiService.tagDetail(id)

  const createTag = (name: string): Promise<ServiceResponse<Tag>> =>
    catalogsApiService.createTag(name)

  const renameTag = (id: string, name: string): Promise<ServiceResponse<Tag>> =>
    catalogsApiService.renameTag(id, name)

  const mergeTags = (sourceId: string, targetId: string): Promise<ServiceResponse<TagMergeResult>> =>
    catalogsApiService.mergeTags(sourceId, targetId)

  const removeTag = (id: string): Promise<ServiceResponse<null>> =>
    catalogsApiService.removeTag(id)

  const listSpecies = () => catalogsApiService.listSpecies()

  async function speciesCare(id: string): Promise<ServiceResponse<SpeciesCare>> {
    const cached = cache.value[id]
    if (cached) return { success: true, data: cached, error: null }

    const result = await catalogsApiService.speciesCare(id)
    if (result.success) cache.value[id] = result.data!
    return result
  }

  return {
    listLocations,
    locationDetail,
    createLocation,
    renameLocation,
    removeLocation,
    listTags,
    tagDetail,
    createTag,
    renameTag,
    mergeTags,
    removeTag,
    listSpecies,
    speciesCare,
  }
}
