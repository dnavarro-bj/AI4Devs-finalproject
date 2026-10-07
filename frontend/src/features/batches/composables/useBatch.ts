import { computed, reactive, ref } from 'vue'
import { useToast } from '@shared/composables/useToast'
import { batchesApiService } from '../services/batches.api.service'
import type { BatchAction, BatchResult, BatchScope } from '../types/batch.types'

/** «Lectura registrada en 31 plantas»: lo que dice el aviso al terminar, según la acción. */
const DONE_TEXT: Record<BatchAction['kind'], string> = {
  reading: 'Lectura registrada',
  intervention: 'Intervención registrada',
  comment: 'Comentario añadido',
}

const plural = (count: number) => `${count} ${count === 1 ? 'planta' : 'plantas'}`

/**
 * El caso de uso de un lote: **decir cuántas plantas afectará antes de escribir nada** y aplicarlo.
 *
 * El número **lo da el servidor** (`preview`), con el mismo código que luego escribe: lo que el
 * diálogo declara es lo que se hace. Excluir una planta o cambiar el alcance vuelve a preguntar, y
 * una respuesta tardía de una pregunta anterior no pisa a la actual (cada pregunta lleva su número
 * de secuencia). Solo viajan las **exclusiones**, nunca la lista de incluidas: el servidor calcula
 * el alcance al aplicar, así que una planta que llegó entre el diálogo y la confirmación no se
 * queda sin su registro.
 *
 * Un error —también el del alcance demasiado grande— se guarda como texto y **no toca** el alcance
 * ni las exclusiones: el usuario corrige y reintenta sin volver a empezar.
 */
export function useBatch() {
  const toast = useToast()

  const scope = ref<BatchScope | null>(null)
  const excluded = reactive(new Set<string>())
  const count = ref<number | null>(null)
  const previewing = ref(false)
  const applying = ref(false)
  const error = ref<string | null>(null)
  let latest = 0

  async function preview() {
    if (!scope.value) {
      count.value = null
      return
    }
    const current = ++latest
    previewing.value = true
    error.value = null
    const result = await batchesApiService.preview(scope.value, [...excluded])
    if (current !== latest) return
    previewing.value = false

    if (!result.success) {
      count.value = null
      error.value = result.error!.message
      return
    }
    count.value = result.data!
  }

  /** Abre con un alcance, o con ninguno: en ese caso primero hay que elegir la localización. */
  async function open(next: BatchScope | null) {
    scope.value = next
    excluded.clear()
    count.value = null
    error.value = null
    applying.value = false
    await preview()
  }

  async function toggle(plantId: string) {
    if (excluded.has(plantId)) excluded.delete(plantId)
    else excluded.add(plantId)
    await preview()
  }

  /** El alcance de una localización, a elección del usuario con o sin sus sublocalizaciones. */
  async function chooseLocation(locationId: string, includeDescendants: boolean) {
    scope.value = { kind: 'location', locationId, includeDescendants }
    excluded.clear()
    await preview()
  }

  async function setDescendants(includeDescendants: boolean) {
    if (scope.value?.kind !== 'location') return
    scope.value = { ...scope.value, includeDescendants }
    await preview()
  }

  /** Confirmar con un alcance vacío no tiene sentido, ni mientras se calcula el número. */
  const canConfirm = computed(() =>
    Boolean(scope.value) && !previewing.value && !applying.value && (count.value ?? 0) > 0,
  )

  async function apply(action: BatchAction, occurredAt?: string): Promise<BatchResult | null> {
    if (!scope.value || applying.value) return null
    applying.value = true
    error.value = null

    const result = await batchesApiService.apply({
      scope: scope.value,
      excludedPlantIds: [...excluded],
      ...(occurredAt ? { occurredAt } : {}),
      action,
    })
    applying.value = false

    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    toast.show(`${DONE_TEXT[action.kind]} en ${plural(result.data!.plantCount)}`)
    return result.data!
  }

  return { scope, excluded, count, previewing, applying, error, canConfirm, open, toggle, chooseLocation, setDescendants, apply }
}
