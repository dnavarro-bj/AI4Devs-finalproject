import type { Location, PageResponse, SpeciesCare, SpeciesSummary } from '../types/api'

/**
 * Los catálogos que pueblan el formulario de alta.
 *
 * `GET /species` devuelve el **resumen** (`id`, `scientificName`, `commonName`): los rangos están
 * solo en `GET /species/{id}`, así que la ficha se pide al seleccionarse una especie y no antes
 * (decisión 1 del design). Se cachea por `id` para que volver a una especie ya vista no repita la
 * llamada.
 *
 * La caché va en `useState` y no en una variable de módulo: así vive con la aplicación Nuxt —se
 * comparte entre componentes, sobrevive a la navegación y no se filtra entre instancias— en lugar
 * de quedarse pegada al módulo para siempre.
 */
export function useCatalogs() {
  const api = useApi()
  const cache = useState<Record<string, SpeciesCare>>('species-care-cache', () => ({}))

  const listLocations = () => api.get<PageResponse<Location>>('/locations')

  const listSpecies = () => api.get<PageResponse<SpeciesSummary>>('/species')

  async function speciesCare(id: string): Promise<SpeciesCare> {
    const cached = cache.value[id]
    if (cached) return cached

    const species = await api.get<SpeciesCare>(`/species/${id}`)
    cache.value[id] = species
    return species
  }

  return { listLocations, listSpecies, speciesCare }
}
