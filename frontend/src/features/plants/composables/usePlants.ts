import type { PageResponse, ServiceResponse } from '@shared/types/api.types'
import { plantsApiService, type PlantQuery } from '../services/plants.api.service'
import { usePlantsStore } from '../store/plants.store'
import type { PlantDetail, PlantProfile, PlantStatus, PlantStatusChange, PlantSummary } from '../types/plant.types'

/**
 * Los casos de uso del inventario.
 *
 * Orquesta el service y refleja el resultado en el store; **no hace HTTP directo** (ADR-015).
 * Devuelve el `ServiceResponse` tal cual para que la pantalla decida qué pintar: quien conoce el
 * hueco de la interfaz es ella, no este composable.
 */
export function usePlants() {
  const store = usePlantsStore()

  async function list(query: PlantQuery = {}): Promise<ServiceResponse<PageResponse<PlantSummary>>> {
    const result = await plantsApiService.list(query)
    if (result.success) store.setPage(result.data!)
    return result
  }

  async function detail(id: string): Promise<ServiceResponse<PlantDetail>> {
    const result = await plantsApiService.detail(id)
    if (result.success) store.setOpenPlant(result.data!)
    return result
  }

  async function create(
    nickname: string,
    locationId: string,
    speciesId: string,
    profile: PlantProfile = {},
    status?: PlantStatus,
  ): Promise<ServiceResponse<PlantDetail>> {
    const result = await plantsApiService.create(nickname, locationId, speciesId, profile, status)
    if (result.success) store.setOpenPlant(result.data!)
    return result
  }

  async function update(
    id: string,
    nickname: string,
    locationId: string,
    speciesId: string,
    profile: PlantProfile = {},
  ): Promise<ServiceResponse<PlantDetail>> {
    const result = await plantsApiService.update(id, nickname, locationId, speciesId, profile)
    if (result.success) store.setOpenPlant(result.data!)
    return result
  }

  async function changeStatus(id: string, status: PlantStatus, reason?: string): Promise<ServiceResponse<PlantDetail>> {
    const result = await plantsApiService.changeStatus(id, status, reason)
    if (result.success) store.setOpenPlant(result.data!)
    return result
  }

  const statusChanges = (id: string, page = 0): Promise<ServiceResponse<PageResponse<PlantStatusChange>>> =>
    plantsApiService.statusChanges(id, page)

  return { list, detail, create, update, changeStatus, statusChanges }
}
