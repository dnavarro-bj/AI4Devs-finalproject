import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import { ok } from '@shared/types/api.types'
import { locationsApiService } from '../services/locations.api.service'
import type {
  LocationDetail,
  LocationInput,
  LocationListQuery,
  LocationSummary,
  MoveResult,
  PlantMovement,
} from '../types/location.types'

/** Las páginas que se recorren como máximo al juntar el catálogo: un tope contra una respuesta que no termine. */
const MAX_PAGES = 200

/**
 * Los casos de uso de las localizaciones.
 *
 * Sin store: el catálogo no es estado global entre features. Cada pantalla pide lo suyo y el
 * composable solo orquesta —no hace HTTP directo, ADR-015—.
 */
export function useLocations() {
  const list = (query: LocationListQuery = {}): Promise<ServiceResponse<PageResponse<LocationSummary>>> =>
    locationsApiService.list(query)

  /**
   * Todas las localizaciones, recorriendo las páginas del listado. El API pagina siempre (ADR-009)
   * y no hay endpoint de árbol sin límite, pero el mapa y los selectores necesitan el conjunto: a
   * esta escala son una o pocas peticiones. **Si una página falla, falla el conjunto**: un árbol a
   * medias engaña más que un error.
   */
  async function loadAll(): Promise<ServiceResponse<LocationSummary[]>> {
    const all: LocationSummary[] = []

    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await locationsApiService.list({ page, sort: 'name' })
      if (!result.success) return { success: false, data: null, error: result.error }

      all.push(...result.data!.content)
      if (!(result.data!.totalPages > page + 1)) break
    }
    return ok(all)
  }

  const detail = (id: string): Promise<ServiceResponse<LocationDetail>> => locationsApiService.detail(id)

  const create = (input: LocationInput): Promise<ServiceResponse<LocationDetail>> => locationsApiService.create(input)

  const update = (id: string, input: LocationInput): Promise<ServiceResponse<LocationDetail>> =>
    locationsApiService.update(id, input)

  const remove = (id: string): Promise<ServiceResponse<null>> => locationsApiService.remove(id)

  const move = (destinationId: string, plantIds: string[]): Promise<ServiceResponse<MoveResult>> =>
    locationsApiService.move(destinationId, plantIds)

  const movements = (id: string, page = 0): Promise<ServiceResponse<PageResponse<PlantMovement>>> =>
    locationsApiService.movements(id, page)

  const plantMovements = (plantId: string, page = 0): Promise<ServiceResponse<PageResponse<PlantMovement>>> =>
    locationsApiService.plantMovements(plantId, page)

  return { list, loadAll, detail, create, update, remove, move, movements, plantMovements }
}
