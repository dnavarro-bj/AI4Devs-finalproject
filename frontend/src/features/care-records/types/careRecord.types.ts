import type { Recommendation } from '@features/recommendations/types/recommendation.types'

/**
 * Una lectura de las condiciones de cultivo.
 *
 * Los cinco valores son opcionales por separado, y el API **omite** los que no se informaron en
 * lugar de mandarlos a `null`: llegan como `undefined`. Quien los pinte debe comprobar ambos.
 *
 * El riego vive aquí y no en una entidad aparte: es un insumo medible, y correlacionar agua
 * entregada contra señales de estrés es una de las razones de ser del producto.
 */
export interface CareRecord {
  id: string
  plantId: string
  recordedAt: string
  humidity?: number | null
  temperature?: number | null
  lightHours?: number | null
  waterAmountMl?: number | null
  soilPh?: number | null
  recommendation?: Recommendation | null
}

/** Lo que se envía al registrar: basta con uno de los cinco. */
export interface CareRecordInput {
  humidity?: number
  temperature?: number
  lightHours?: number
  waterAmountMl?: number
  soilPh?: number
  /** Opcional: si no va, el servidor sella el momento actual. Nunca puede ser futura. */
  recordedAt?: string
}
