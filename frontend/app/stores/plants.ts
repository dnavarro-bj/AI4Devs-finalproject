import { defineStore } from 'pinia'
import type { PageResponse, PlantDetail, PlantSummary } from '../types/api'

/**
 * Estado compartido del inventario (decisión 6 del design): la página actual y la planta abierta,
 * para que volver del detalle al listado no vuelva a pedirlo todo y para que el alta pueda
 * insertar la planta creada sin recargar. El estado efímero de los formularios vive en su
 * componente, no aquí.
 */
export const usePlantsStore = defineStore('plants', () => {
  const page = ref<PageResponse<PlantSummary> | null>(null)
  const openPlant = ref<PlantDetail | null>(null)

  function setPage(value: PageResponse<PlantSummary>) {
    page.value = value
  }

  function setOpenPlant(value: PlantDetail | null) {
    openPlant.value = value
  }

  return { page, openPlant, setPage, setOpenPlant }
})
