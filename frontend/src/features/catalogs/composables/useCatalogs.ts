import type { SpeciesCare } from '@features/species/types/species.types'
import type { ServiceResponse } from '@shared/types/api.types'
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

  const listLocations = () => catalogsApiService.listLocations()
  const listSpecies = () => catalogsApiService.listSpecies()

  async function speciesCare(id: string): Promise<ServiceResponse<SpeciesCare>> {
    const cached = cache.value[id]
    if (cached) return { success: true, data: cached, error: null }

    const result = await catalogsApiService.speciesCare(id)
    if (result.success) cache.value[id] = result.data!
    return result
  }

  return { listLocations, listSpecies, speciesCare }
}
