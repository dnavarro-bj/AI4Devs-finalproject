import { ref } from 'vue'
import { useToast } from '@shared/composables/useToast'
import { tasksApiService } from '../services/tasks.api.service'
import type { Task, TaskInput } from '../types/task.types'

/**
 * Guardar una tarea: el alta y el reemplazo comparten formulario y también caso de uso.
 *
 * El error del API **no se pierde en un toast**: queda en `error` para que el diálogo lo muestre sin
 * cerrarse y sin perder lo escrito (el toast confirma lo ya ocurrido, no explica un fallo).
 */
export function useTaskEditor() {
  const toast = useToast()
  const submitting = ref(false)
  const error = ref<string | null>(null)

  /** Devuelve la tarea guardada, o `null` si falló (y entonces `error` dice por qué). */
  async function save(taskId: string | null, input: TaskInput): Promise<Task | null> {
    submitting.value = true
    error.value = null

    const result = taskId
      ? await tasksApiService.update(taskId, input)
      : await tasksApiService.create(input)
    submitting.value = false

    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    toast.show(taskId ? 'Tarea actualizada' : 'Tarea creada')
    return result.data!
  }

  /** El listado trae el número de plantas; editar necesita **cuáles** son. */
  async function loadForEdit(id: string): Promise<Task | null> {
    error.value = null
    const result = await tasksApiService.detail(id)
    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    return result.data!
  }

  function reset() {
    error.value = null
    submitting.value = false
  }

  return { submitting, error, save, loadForEdit, reset }
}
