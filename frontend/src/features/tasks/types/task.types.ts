/**
 * El modelo de la maqueta de tareas. **Provisional**: las preguntas 14 a 18 del §24 del documento
 * de producto —día exacto o periodo, destino, tipos configurables, recurrencia, efecto de completar
 * en el historial— siguen abiertas, y T-22 las decide. Estos campos son los que el prototipo
 * muestra, no un modelo acordado.
 */

export type TaskType =
  | 'watering'
  | 'cold-protection'
  | 'sun-protection'
  | 'root-pruning'
  | 'repotting'
  | 'other'

export type TaskPriority = 'high' | 'normal' | 'low'

export type TaskStatus = 'pending' | 'completed'

export interface Task {
  id: string
  type: TaskType
  title: string
  /** A qué se dirige, en una línea: «31 plantas», «6 plantas · selección guardada». */
  target: string
  location: string
  /** `YYYY-MM-DD`. «Vencida» se calcula contra la fecha de referencia, no se almacena. */
  due: string
  /** `HH:MM`, o `null` si la tarea es flexible dentro del día. */
  time: string | null
  priority: TaskPriority
  status: TaskStatus
}

export interface TaskFilters {
  /** Vacío = todas. */
  location: string
  type: string
  priority: string
  /** `overdue` o `today`: lo que abre cada cifra del Dashboard. Vacío = sin filtrar por vencimiento. */
  due: string
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'watering': 'Riego',
  'cold-protection': 'Protección frente al frío',
  'sun-protection': 'Protección solar',
  'root-pruning': 'Poda de raíces',
  'repotting': 'Cambio de maceta',
  'other': 'Otra',
}

/** Símbolos del lenguaje visual del vivero; se comparten entre agenda y editor. */
export const TASK_TYPE_MARKS: Record<TaskType, string> = {
  'watering': '◇',
  'cold-protection': '❄',
  'sun-protection': '☼',
  'root-pruning': '⌇',
  'repotting': '▱',
  'other': '◉',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
}
