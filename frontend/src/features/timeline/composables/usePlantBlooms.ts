import { computed, ref } from 'vue'
import type { ServiceResponse } from '@shared/types/api.types'
import { timelineApiService } from '../services/timeline.api.service'
import type { BloomInput, TimelineEntry } from '../types/timeline.types'

/**
 * Las floraciones **observadas** del ejemplar: la pestaña «Floración» y «última floración» de «de
 * un vistazo». Salen de la misma cronología, filtrada por `floracion` en el servidor, así que la
 * primera es la más reciente por inicio. La floración esperada de la especie es otro dato y no
 * pasa por aquí.
 *
 * `last` es `undefined` hasta que se consulta y `null` cuando no hay ninguna: «sin consultar» y
 * «nunca ha florecido» no son lo mismo.
 */
export function usePlantBlooms(plantId: string) {
  const items = ref<TimelineEntry[]>([])
  const total = ref(0)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const last = computed(() => (loaded.value ? items.value[0]?.bloom ?? null : undefined))

  async function load() {
    loading.value = !loaded.value
    error.value = null
    const result = await timelineApiService.list(plantId, { types: ['floracion'] })
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    items.value = result.data?.content ?? []
    total.value = result.data?.totalElements ?? items.value.length
    loaded.value = true
  }

  /** Crea, o corrige si se da `id` (cerrar una floración es corregirla). Recarga al guardar. */
  async function save(input: BloomInput, id?: string): Promise<ServiceResponse<TimelineEntry>> {
    const result = id
      ? await timelineApiService.update(plantId, 'blooms', id, input)
      : await timelineApiService.create(plantId, 'blooms', input)
    if (result.success) await load()
    return result
  }

  async function remove(id: string): Promise<ServiceResponse<null>> {
    const result = await timelineApiService.remove(plantId, 'blooms', id)
    if (result.success) await load()
    return result
  }

  return { items, total, loaded, loading, error, last, load, save, remove }
}
