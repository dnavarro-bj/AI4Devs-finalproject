import { computed, ref, watch } from 'vue'
import { useDebouncedRef } from '@shared/composables/useDebouncedRef'
import { useLocations } from '@features/locations/composables/useLocations'
import { plantsApiService } from '@features/plants/services/plants.api.service'
import type { LocationSummary } from '@features/locations/types/location.types'
import type { PlantSummary } from '@features/plants/types/plant.types'

/** Lo que el selector de destino enseña de una planta: lo justo para reconocerla y quitarla. */
export interface PickablePlant {
  id: string
  code: string
  nickname: string
  detail: string
}

export const MAX_TARGET_PLANTS = 500

/** El destino que el formulario edita: **una** localización o un conjunto de plantas, nunca las dos. */
export interface DestinationValue {
  mode: 'location' | 'plants'
  locationId: string
  plants: PickablePlant[]
}

const toPickable = (plant: PlantSummary): PickablePlant => ({
  id: plant.id,
  code: plant.code,
  nickname: plant.nickname,
  detail: `${plant.species.scientificName} · ${plant.location.name}`,
})

/**
 * Lo que necesita elegir el destino de una tarea: las localizaciones del catálogo y un buscador de
 * plantas por código, apodo o especie (`q`, con pausa y descartando respuestas viejas).
 *
 * Solo se busca entre lo **en curso**: el API rechaza una tarea dirigida a una planta archivada.
 */
export function useTaskDestination() {
  const { loadAll } = useLocations()

  const locations = ref<LocationSummary[]>([])
  const query = ref('')
  const settled = useDebouncedRef(query, 250)
  const results = ref<PickablePlant[]>([])
  const searching = ref(false)
  const error = ref<string | null>(null)
  let latest = 0

  async function loadLocations() {
    if (locations.value.length) return
    const result = await loadAll()
    if (result.success) locations.value = result.data!
    else error.value = result.error!.message
  }

  watch(settled, async (text) => {
    const current = ++latest
    if (!text.trim()) {
      results.value = []
      searching.value = false
      return
    }
    searching.value = true
    const result = await plantsApiService.list({ q: text, size: 8, sort: 'code,asc' })
    if (current !== latest) return
    searching.value = false
    results.value = result.success ? result.data!.content.map(toPickable) : []
    error.value = result.success ? null : result.error!.message
  })

  const locationOptions = computed(() => locations.value.map((location) => ({
    value: location.id,
    label: location.path || location.name,
  })))

  /** Cuántas plantas hay ahora en la localización y debajo de ella: lo que el destino afectaría. */
  const plantCountOf = (id: string) => locations.value.find((location) => location.id === id)?.plantCountTotal ?? null

  return { loadLocations, locationOptions, plantCountOf, query, results, searching, error }
}
