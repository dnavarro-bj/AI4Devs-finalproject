import type { PageResponse, PlantDetail, PlantSummary } from '../types/api'
import { usePlantsStore } from '../stores/plants'

/**
 * Acceso al inventario. Los listados se consumen siempre como `PageResponse`, nunca como array
 * plano, y el cliente **no fija `size`**: deja el tamaño por defecto del servidor en lugar de
 * duplicar una configuración que vive en `application.yml` (decisión 5 del design).
 */
export function usePlants() {
  const api = useApi()
  const store = usePlantsStore()

  async function list(page = 0): Promise<PageResponse<PlantSummary>> {
    const result = await api.get<PageResponse<PlantSummary>>('/plants', { page })
    store.setPage(result)
    return result
  }

  async function detail(id: string): Promise<PlantDetail> {
    const plant = await api.get<PlantDetail>(`/plants/${id}`)
    store.setOpenPlant(plant)
    return plant
  }

  async function create(nickname: string, locationId: string, speciesId: string): Promise<PlantDetail> {
    const plant = await api.post<PlantDetail>('/plants', { nickname, locationId, speciesId })
    store.setOpenPlant(plant)
    return plant
  }

  return { list, detail, create }
}
