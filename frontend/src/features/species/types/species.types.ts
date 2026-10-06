/** El catálogo de especies. */

import type { SoilMixSummary } from '@features/soil-mixes/types/soilMix.types'

/** Lo que devuelve `GET /species`: sin rangos. */
export interface SpeciesSummary {
  id: string
  /** El código de inventario (`CAT-GRUSS`): prefijo del de cada uno de sus ejemplares. */
  code: string
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
 * Lo que devuelve `GET /species/{id}`: la ficha más **cuántos ejemplares tiene**, que decide si el
 * código se puede corregir. No viaja dentro de `GET /plants/{id}`, donde no tendría sentido.
 */
export interface SpeciesDetail extends SpeciesCare {
  plantCount: number
}

/**
 * Lo que el alta y la corrección envían. El `PUT` es **reemplazo completo**, así que es el mismo
 * cuerpo que el `POST`, y la mezcla viaja por identificador: por eso la ficha lo devuelve.
 */
export interface SpeciesInput {
  /** Obligatorio: lo escribe quien da de alta la especie. Con ejemplares no se puede cambiar. */
  code: string
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
