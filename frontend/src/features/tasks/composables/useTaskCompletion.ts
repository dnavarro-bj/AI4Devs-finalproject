import { computed, reactive, ref } from 'vue'
import { useToast } from '@shared/composables/useToast'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import type { PageResponse } from '@shared/types/api.types'
import { tasksApiService } from '../services/tasks.api.service'
import { completedAtFor } from '../mappers/task.mapper'
import type { Task, TaskCompletionInput, TaskScopePlant } from '../types/task.types'

export const SCOPE_PAGE_SIZE = 50

/** Lo que el diálogo recoge del registro opcional; cuál se ofrece lo decide el tipo de la tarea. */
export interface CompletionRecordDraft {
  waterAmountMl?: number
  potSize?: number
  notes?: string
}

/**
 * Completar una tarea: **enseñar el alcance antes de escribir nada**.
 *
 * El alcance se pide paginado (`/tasks/{id}/scope`) y las **exclusiones** se guardan aquí, en un
 * conjunto de ids, para que cambiar de página no las pierda. Solo viajan las exclusiones: la lista de
 * incluidas la calcula el servidor al completar, de modo que una planta que llegó entre el diálogo y
 * la confirmación no se queda sin su evento.
 */
export function useTaskCompletion() {
  const toast = useToast()
  const today = useReferenceDate()

  const task = ref<Task | null>(null)
  const scope = ref<PageResponse<TaskScopePlant> | null>(null)
  const page = ref(0)
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const excluded = reactive(new Set<string>())

  async function loadPage(next: number) {
    if (!task.value) return
    loading.value = true
    error.value = null
    const result = await tasksApiService.scope(task.value.id, next, SCOPE_PAGE_SIZE)
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    scope.value = result.data!
    page.value = next
  }

  /** Abre el diálogo para una tarea: empieza sin exclusiones y con la primera página del alcance. */
  async function start(target: Task) {
    task.value = target
    scope.value = null
    page.value = 0
    error.value = null
    excluded.clear()
    await loadPage(0)
  }

  function toggle(plantId: string) {
    if (excluded.has(plantId)) excluded.delete(plantId)
    else excluded.add(plantId)
  }

  const total = computed(() => scope.value?.totalElements ?? 0)
  const affected = computed(() => total.value - excluded.size)

  /** Confirmar con un alcance vacío no tiene sentido: la tarea no afectaría a ninguna planta. */
  const canConfirm = computed(() => Boolean(task.value) && !loading.value && !submitting.value && affected.value > 0)

  /** La fecha de finalización se rechaza antes de enviarla si es futura. */
  const isFuture = (day: string) => Boolean(day) && day > today.value

  async function confirm(day: string, record: CompletionRecordDraft | null): Promise<Task | null> {
    if (!task.value || !canConfirm.value) return null
    if (isFuture(day)) {
      error.value = 'La fecha de finalización no puede ser futura.'
      return null
    }

    const body: TaskCompletionInput = {}
    const completedAt = completedAtFor(day, today.value)
    if (completedAt) body.completedAt = completedAt
    if (excluded.size) body.excludedPlantIds = [...excluded]
    const kind = record ? recordKind(task.value, record) : null
    if (record && kind === 'reading') body.reading = { waterAmountMl: record.waterAmountMl! }
    if (record && kind === 'trasplante') body.intervention = { type: 'trasplante', potSize: record.potSize! }
    if (record && kind === 'poda') body.intervention = { type: 'poda', ...(record.notes ? { notes: record.notes } : {}) }

    submitting.value = true
    error.value = null
    const result = await tasksApiService.complete(task.value.id, body)
    submitting.value = false

    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    const count = result.data!.completion?.affectedPlants ?? affected.value
    toast.show(`Tarea completada: se registró en ${count} ${count === 1 ? 'planta' : 'plantas'}`)
    return result.data!
  }

  return { task, scope, page, loading, submitting, error, excluded, total, affected, canConfirm, isFuture, start, loadPage, toggle, confirm }
}

/** El registro solo existe si lo escrito lo pide: un campo vacío es «sin registro», no un registro vacío. */
function recordKind(task: Task, record: CompletionRecordDraft): 'reading' | 'trasplante' | 'poda' | null {
  if (task.type === 'riego' && record.waterAmountMl !== undefined) return 'reading'
  if (task.type === 'cambio_maceta' && record.potSize !== undefined) return 'trasplante'
  if (task.type === 'poda_raices' && record.notes) return 'poda'
  return null
}
