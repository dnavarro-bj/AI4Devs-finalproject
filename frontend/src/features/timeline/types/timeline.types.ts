import type { CareRecord } from '@features/care-records/types/careRecord.types'
import type { PlantStatus } from '@features/plants/types/plant.types'

/**
 * La cronología unificada del ejemplar (T-20). Cada entrada trae `id`, `type`, `occurredAt`, su
 * `batchId` si la operación alcanzó a varias plantas, y **un solo** objeto de detalle con el nombre
 * de su tipo.
 *
 * `type` es `string` y no la unión: un tipo que el cliente no conoce llega igualmente y se muestra
 * con representación de reserva en vez de descartarse.
 */
export type TimelineType = 'lectura' | 'cambio_estado' | 'movimiento' | 'comentario' | 'intervencion' | 'floracion' | 'tarea'

export const TIMELINE_TYPES: TimelineType[] = [
  'lectura', 'cambio_estado', 'movimiento', 'comentario', 'intervencion', 'floracion', 'tarea',
]

export type InterventionType = 'trasplante' | 'sustrato' | 'tratamiento' | 'fertilizacion' | 'poda' | 'revision'
export type BloomStatus = 'boton' | 'en_flor' | 'finalizada'

export interface TimelineEntry {
  id: string
  type: TimelineType | string
  occurredAt: string
  batchId?: string
  reading?: CareRecord
  statusChange?: { from: PlantStatus, to: PlantStatus, reason?: string | null }
  movement?: { from: { id: string, name: string }, to: { id: string, name: string } }
  comment?: { text: string, editedAt?: string | null }
  intervention?: Intervention
  bloom?: Bloom
  /** Una tarea completada: lo escribe completar una tarea y no se edita desde la cronología. */
  task?: TimelineTask
}

/** El detalle de un evento `tarea`: qué tarea se completó. */
export interface TimelineTask {
  taskId: string
  type: string
  title: string
}

export interface Intervention {
  type: InterventionType
  product?: string | null
  potSize?: string | null
  soilMix?: { id: string, name: string } | null
  notes?: string | null
  /** La tarea con la que se registró, si la hubo. */
  taskId?: string | null
}

export interface Bloom {
  /** `YYYY-MM-DD`: una floración se anota por días, no por instantes. */
  startedOn: string
  endedOn?: string | null
  status: BloomStatus
  flowerCount?: number | null
  notes?: string | null
}

/** Los tres recursos que se crean desde la ficha; el nombre es el del segmento de la ruta. */
export type EventResource = 'comments' | 'interventions' | 'blooms'

export interface CommentInput { text: string, occurredAt?: string }

export interface InterventionInput {
  type: InterventionType
  occurredAt?: string
  product?: string
  potSize?: string
  soilMixId?: string
  notes?: string
}

export interface BloomInput {
  startedOn: string
  endedOn?: string
  status: BloomStatus
  flowerCount?: number
  notes?: string
}

export type EventInput = CommentInput | InterventionInput | BloomInput

export interface TimelineQuery {
  /** Repetible. Vacío: todos los tipos. El filtro lo aplica el servidor, antes de paginar. */
  types?: string[]
  page?: number
  size?: number
}
