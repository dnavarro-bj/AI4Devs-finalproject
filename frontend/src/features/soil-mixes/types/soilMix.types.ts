/**
 * El catálogo de mezclas de sustrato (historia 0.8).
 *
 * Los porcentajes suman 100 por invariante de la entidad, así que la suma no viaja: es un dato
 * derivado, y un derivado que viaja puede contradecir a su origen.
 *
 * El DTO y el modelo coinciden campo a campo, así que se reexporta el tipo en vez de escribir un
 * mapper por ritual (ADR-015).
 */
export interface SoilMix {
  id: string
  name: string
  organicPercentage: number
  mineralPercentage: number
  phMin: number
  phMax: number
  description: string | null
}

/** La ficha añade cuántas especies la recomiendan: lo que decide si se puede retirar. */
export interface SoilMixDetail extends SoilMix {
  speciesCount: number
}

/** Lo que el alta y la corrección envían. El `PUT` es reemplazo completo, así que es el mismo. */
export interface SoilMixInput {
  name: string
  organicPercentage: number
  mineralPercentage: number
  phMin: number
  phMax: number
  description: string | null
}

/** La mezcla vista desde la ficha de una especie: nombre para pintar, id para volver a enviar. */
export interface SoilMixSummary {
  id: string
  name: string
}
