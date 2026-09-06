import { defineStore } from 'pinia'
import type { PageResponse } from '@shared/types/api.types'
import type { PlantDetail, PlantSummary } from '../types/plant.types'

/**
 * Estado compartido del inventario: la página actual y la planta abierta, para que volver del
 * detalle al listado no vuelva a pedirlo todo y para que el alta pueda insertar la planta creada
 * sin recargar. El estado efímero de los formularios vive en su componente, no aquí.
 *
 * Vive en la feature y no en `shared/` porque hoy solo la usa `plants` (ADR-015). Si el bloque 1
 * lo necesita desde otra feature, sube entonces.
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
