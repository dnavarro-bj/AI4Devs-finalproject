import type { PageResponse, ServiceResponse } from '@shared/types/api.types'

/**
 * El modelo de tareas del API (`tareas-modelo-y-api`): lo que viaja, tal cual. Tipos y estados son
 * los valores del API y se muestran con **etiquetas**; no hay un segundo vocabulario.
 *
 * Todo identificador es `string` (ADR-008). Las fechas del periodo son **días** (`YYYY-MM-DD`), sin
 * hora: «vencida» se calcula contra la fecha de referencia, no se almacena.
 */

export type TaskType =
  | 'riego'
  | 'proteccion_frio'
  | 'proteccion_sol'
  | 'poda_raices'
  | 'cambio_maceta'
  | 'otra'

export type TaskPriority = 'alta' | 'normal' | 'baja'

export type TaskStatus = 'pendiente' | 'completada' | 'omitida' | 'cancelada'

export interface TaskLocationTarget {
  kind: 'location'
  location: { id: string, name: string, path: string }
}

export interface TaskPlantsTarget {
  kind: 'plants'
  plantCount: number
  /** Solo en el detalle de la tarea: el listado trae el número. */
  plants?: { id: string, code: string, nickname: string }[]
}

export type TaskTarget = TaskLocationTarget | TaskPlantsTarget

export interface Task {
  id: string
  type: TaskType
  title: string
  priority: TaskPriority
  status: TaskStatus
  /** `YYYY-MM-DD`. Un día exacto es `dueFrom === dueTo`. */
  dueFrom: string
  dueTo: string
  notes?: string | null
  origin: 'manual'
  target: TaskTarget
  /** Solo en una tarea completada. */
  completion?: { completedAt: string, affectedPlants: number } | null
  /** El motivo de una omitida o cancelada, si lo hubo. */
  closedReason?: string | null
  createdAt: string
  updatedAt: string
}

/** Lo que se envía para crear o reemplazar una tarea: o `locationId` o `plantIds`, nunca los dos. */
export interface TaskInput {
  type: TaskType
  title: string
  priority: TaskPriority
  dueFrom: string
  dueTo?: string
  notes?: string
  locationId?: string
  plantIds?: string[]
}

/** Los criterios del listado, con la convención de ADR-016: repetible es «cualquiera de los valores». */
export interface TaskListQuery {
  page?: number
  size?: number
  /** `due`, `createdAt` o `title`, con `,asc` o `,desc`. */
  sort?: string
  status?: string[]
  type?: string[]
  priority?: string[]
  q?: string
  /** Intervalo `YYYY-MM-DD`: las tareas cuyo periodo se solapa con él. */
  from?: string
  to?: string
  /** `overdue` o `today`: se calculan contra `today`. */
  due?: 'overdue' | 'today'
  /** Qué día es para quien pregunta; sin él, el servidor usa el suyo. */
  today?: string
  location?: string
  includeDescendants?: boolean
  plant?: string
  species?: string
}

/** Una planta del alcance de una tarea: lo que el diálogo de completar enseña antes de confirmar. */
export interface TaskScopePlant {
  id: string
  code: string
  nickname: string
  species: { id: string, scientificName: string }
  location: { id: string, name: string, path?: string }
}

export interface TaskCompletionInput {
  /** Un instante ISO; sin él, el servidor usa «ahora». No puede ser futuro. */
  completedAt?: string
  excludedPlantIds?: string[]
  /** El mismo registro se aplica a cada planta incluida. */
  reading?: { waterAmountMl?: number }
  intervention?: { type: 'trasplante' | 'poda', potSize?: number, notes?: string }
}

export interface TaskScheduleInput {
  dueFrom: string
  dueTo?: string
}

/** El contrato del service de tareas: lo cumplen el cliente HTTP real y, mientras no hay backend, el mock. */
export interface TasksApi {
  list(query?: TaskListQuery): Promise<ServiceResponse<PageResponse<Task>>>
  detail(id: string): Promise<ServiceResponse<Task>>
  create(input: TaskInput): Promise<ServiceResponse<Task>>
  update(id: string, input: TaskInput): Promise<ServiceResponse<Task>>
  schedule(id: string, input: TaskScheduleInput): Promise<ServiceResponse<Task>>
  scope(id: string, page?: number, size?: number): Promise<ServiceResponse<PageResponse<TaskScopePlant>>>
  complete(id: string, input: TaskCompletionInput): Promise<ServiceResponse<Task>>
  skip(id: string, reason?: string): Promise<ServiceResponse<Task>>
  cancel(id: string, reason?: string): Promise<ServiceResponse<Task>>
}

export const TASK_TYPES: TaskType[] = [
  'riego', 'proteccion_frio', 'proteccion_sol', 'poda_raices', 'cambio_maceta', 'otra',
]

export const TASK_PRIORITIES: TaskPriority[] = ['alta', 'normal', 'baja']

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  riego: 'Riego',
  proteccion_frio: 'Protección frente al frío',
  proteccion_sol: 'Protección solar',
  poda_raices: 'Poda de raíces',
  cambio_maceta: 'Cambio de maceta',
  otra: 'Otra',
}

/** Símbolos del lenguaje visual del vivero; se comparten entre agenda y editor. */
export const TASK_TYPE_MARKS: Record<TaskType, string> = {
  riego: '◇',
  proteccion_frio: '❄',
  proteccion_sol: '☼',
  poda_raices: '⌇',
  cambio_maceta: '▱',
  otra: '◉',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: 'Alta',
  normal: 'Normal',
  baja: 'Baja',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  completada: 'Completada',
  omitida: 'Omitida',
  cancelada: 'Cancelada',
}

/** Los estados que ya no están pendientes: lo que lista «Completadas». */
export const CLOSED_STATUSES: TaskStatus[] = ['completada', 'omitida', 'cancelada']
