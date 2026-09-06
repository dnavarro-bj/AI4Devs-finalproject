/** El catálogo de especies. */

/** Lo que devuelve `GET /species`: sin rangos. */
export interface SpeciesSummary {
  id: string
  scientificName: string
  commonName: string
}

/**
 * Lo que devuelve `GET /species/{id}`, y lo que viaja dentro de `GET /plants/{id}`. Los rangos
 * solo están aquí: el listado del catálogo no los trae.
 */
export interface SpeciesCare extends SpeciesSummary {
  minHumidity: number
  maxHumidity: number
  minTemperature: number
  maxTemperature: number
  minLightHours: number
  maxLightHours: number
  wateringGuideline: string
}
