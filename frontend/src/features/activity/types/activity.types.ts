import type { PageResponse, ServiceResponse } from '@shared/types/api.types'

/** Lo que se ha hecho en la colección (`dashboard-operativo`). Todo identificador es `string` (ADR-008). */

export type ActivityType = 'lote' | 'tarea' | 'comentario' | 'intervencion'
export type ActivityBatchAction = 'lectura' | 'intervencion' | 'comentario'

/**
 * Una entrada del feed. Lleva **el detalle de su tipo** en un objeto con su nombre y ningún otro; un
 * tipo que el cliente no conoce llega igual y se pinta con su representación de reserva.
 */
export interface ActivityEntry {
  id: string
  type: ActivityType | string
  occurredAt: string
  batch?: { id: string, action: ActivityBatchAction, plantCount: number }
  task?: { id: string, type: string, title: string, affectedPlants: number }
  plant?: { id: string, code: string, nickname: string }
  comment?: { excerpt: string }
  intervention?: { type: string }
}

export interface ActivityQuery {
  page?: number
  size?: number
}

export interface ActivityApi {
  list(query?: ActivityQuery): Promise<ServiceResponse<PageResponse<ActivityEntry>>>
}
