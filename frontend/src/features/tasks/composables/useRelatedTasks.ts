import { ref } from 'vue'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { tasksApiService } from '../services/tasks.api.service'
import type { Task, TaskListQuery } from '../types/task.types'

/** Lo que una ficha enseña de su trabajo: las más próximas, y cuántas hay en total. */
const PREVIEW = 5

/**
 * El próximo trabajo de una **planta** o de una **localización**: las tareas pendientes que le
 * afectan, las que acaban antes primero. El API resuelve qué le afecta —una tarea sobre un
 * invernadero afecta a las plantas que hay en él—; aquí solo se pide con el criterio de la ficha.
 *
 * `criteria` es una función porque el identificador puede no estar listo al montar. La consulta
 * lleva `today` como toda petición de tareas.
 */
export function useRelatedTasks(criteria: () => Pick<TaskListQuery, 'plant' | 'location' | 'includeDescendants'>, size = PREVIEW) {
  const today = useReferenceDate()

  const tasks = ref<Task[]>([])
  const total = ref(0)
  /** `false` hasta la primera respuesta: «sin consultar» no es «sin trabajo». */
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    const result = await tasksApiService.list({
      ...criteria(), status: ['pendiente'], sort: 'due,asc', size, today: today.value,
    })
    loading.value = false

    if (!result.success) {
      error.value = result.error!.message
      return
    }
    tasks.value = result.data!.content
    total.value = result.data!.totalElements
    loaded.value = true
  }

  return { tasks, total, loaded, loading, error, load, today }
}
