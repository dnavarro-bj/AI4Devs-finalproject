/**
 * El trabajo por lote: **una acción aplicada a muchas plantas como una sola operación**. Estos son
 * los tipos del contrato con el API; ninguno llega a un componente sin pasar por el composable.
 */

/**
 * A qué plantas se aplica un lote. Es exactamente una de las tres formas:
 *
 * * una **lista** de plantas elegidas (las filas marcadas de una página);
 * * una **localización**, con o sin sus sublocalizaciones;
 * * una **consulta** del inventario —la *query string* canónica del listado—: «todo el resultado»
 *   viaja como una cadena, no como cientos de identificadores.
 */
export type BatchScope =
  | { kind: 'plants', plantIds: string[] }
  | { kind: 'location', locationId: string, includeDescendants?: boolean }
  | { kind: 'query', query: string }

export interface BatchReadingValues {
  humidity?: number
  temperature?: number
  lightHours?: number
  waterAmountMl?: number
  soilPh?: number
}

export interface BatchInterventionValues {
  type: string
  product?: string
  potSize?: string
  soilMixId?: string
  notes?: string
}

/**
 * Lo que se aplica a cada planta: los mismos datos que el alta individual de su tipo. Es el modelo de
 * la feature; **en el cuerpo del API no hay un campo `action`**: el service lo traduce a exactamente
 * uno de `reading`, `intervention` o `comment`.
 */
export type BatchAction =
  | { kind: 'reading', reading: BatchReadingValues }
  | { kind: 'intervention', intervention: BatchInterventionValues }
  | { kind: 'comment', comment: { text: string } }

export type BatchActionKind = BatchAction['kind']

export interface BatchRequest {
  scope: BatchScope
  excludedPlantIds?: string[]
  occurredAt?: string
  action: BatchAction
}

/** La operación que devuelve el API al aplicar (`201`): su tipo, su alcance y **a cuántas plantas llegó de verdad**. */
export interface BatchResult {
  id: string
  action: string
  scopeKind: string
  plantCount: number
  occurredAt: string
  createdAt?: string
}

/** Una planta del alcance cuando el alcance es una lista: lo justo para decir cuál se excluye. */
export interface BatchPlant {
  id: string
  code: string
  nickname: string
  detail?: string
}

export const BATCH_ACTION_LABELS: Record<BatchActionKind, { title: string, verb: string }> = {
  reading: { title: 'Registrar lectura', verb: 'Se registrará la lectura' },
  intervention: { title: 'Registrar intervención', verb: 'Se registrará la intervención' },
  comment: { title: 'Añadir comentario', verb: 'Se añadirá el comentario' },
}
