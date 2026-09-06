import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import { plantsApiService } from '../services/plants.api.service'
import { usePlantsStore } from '../store/plants.store'
import type { PlantDetail, PlantSummary } from '../types/plant.types'

/**
 * Los casos de uso del inventario.
 *
 * Orquesta el service y refleja el resultado en el store; **no hace HTTP directo** (ADR-015).
 * Devuelve el `ServiceResponse` tal cual para que la pantalla decida qué pintar: quien conoce el
 * hueco de la interfaz es ella, no este composable.
 */
export function usePlants() {
  const store = usePlantsStore()

  async function list(page = 0): Promise<ServiceResponse<PageResponse<PlantSummary>>> {
    const result = await plantsApiService.list(page)
    if (result.success) store.setPage(result.data!)
    return result
  }

  async function detail(id: string): Promise<ServiceResponse<PlantDetail>> {
    const result = await plantsApiService.detail(id)
    if (result.success) store.setOpenPlant(result.data!)
    return result
  }

  async function create(nickname: string, locationId: string, speciesId: string): Promise<ServiceResponse<PlantDetail>> {
    const result = await plantsApiService.create(nickname, locationId, speciesId)
    if (result.success) store.setOpenPlant(result.data!)
    return result
  }

  return { list, detail, create }
}
