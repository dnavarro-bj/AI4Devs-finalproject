/** El catálogo de especies. */

import type { SoilMixSummary } from '@features/soil-mixes/types/soilMix.types'

/** Lo que devuelve `GET /species`: sin rangos. */
export interface SpeciesSummary {
  id: string
  scientificName: string
  commonName: string
}

/**
 * Lo que devuelve `GET /species/{id}`, y lo que viaja dentro de `GET /plants/{id}`. Los rangos y
 * la mezcla solo están aquí: el listado del catálogo no los trae.
 */
export interface SpeciesCare extends SpeciesSummary {
  minHumidity: number
  maxHumidity: number
  minTemperature: number
  maxTemperature: number
  minLightHours: number
  maxLightHours: number
  wateringGuideline: string
  soilMix: SoilMixSummary
}

/**
 * Lo que el alta y la corrección envían. El `PUT` es **reemplazo completo**, así que es el mismo
 * cuerpo que el `POST`, y la mezcla viaja por identificador: por eso la ficha lo devuelve.
 */
export interface SpeciesInput {
  scientificName: string
  commonName: string
  minHumidity: number
  maxHumidity: number
  minTemperature: number
  maxTemperature: number
  minLightHours: number
  maxLightHours: number
  wateringGuideline: string
  soilMixId: string
}
