import { ref } from 'vue'
import { useToast } from '@shared/composables/useToast'
import { tasksApiService } from '../services/tasks.api.service'
import type { Task } from '../types/task.types'

/**
 * Reprogramar, omitir y cancelar: lo que cambia el estado de una tarea **sin** escribir ningún
 * cuidado. Las tres comparten forma: una petición, un error que se muestra en el diálogo sin perder
 * lo escrito y un aviso al terminar.
 */
export function useTaskClosing() {
  const toast = useToast()
  const submitting = ref(false)
  const error = ref<string | null>(null)

  async function run(request: () => ReturnType<typeof tasksApiService.cancel>, message: string): Promise<Task | null> {
    submitting.value = true
    error.value = null
    const result = await request()
    submitting.value = false

    if (!result.success) {
      error.value = result.error!.message
      return null
    }
    toast.show(message)
    return result.data!
  }

  const reschedule = (task: Task, dueFrom: string, dueTo?: string) =>
    run(() => tasksApiService.schedule(task.id, { dueFrom, ...(dueTo ? { dueTo } : {}) }), 'Tarea reprogramada')

  const skip = (task: Task, reason?: string) => run(() => tasksApiService.skip(task.id, reason?.trim() || undefined), 'Tarea omitida')

  const cancel = (task: Task, reason?: string) => run(() => tasksApiService.cancel(task.id, reason?.trim() || undefined), 'Tarea cancelada')

  function reset() {
    error.value = null
    submitting.value = false
  }

  return { submitting, error, reschedule, skip, cancel, reset }
}
