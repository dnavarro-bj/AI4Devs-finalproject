import { ok, type ServiceResponse } from '@shared/types/api.types'
import { TASKS_MOCK, USE_MOCK_TASKS } from '../mocks/tasks.mock'
import type { Task } from '../types/task.types'

/**
 * Las tareas.
 *
 * El API no tiene tareas todavía (T-22), así que el service resuelve contra datos de ejemplo tras
 * su bandera. Es aquí, y no en el composable ni en el componente, donde entra el mock (ADR-015):
 * conectar las tareas reales será sustituir el cuerpo de esta función y borrar `mocks/`.
 */
export const tasksApiService = {
  async list(): Promise<ServiceResponse<Task[]>> {
    return ok(USE_MOCK_TASKS ? TASKS_MOCK.map((task) => ({ ...task })) : [])
  },
}
