/** El catálogo de especies. */

import type { SoilMixSummary } from '@features/soil-mixes/types/soilMix.types'
import type { PhotoSummary } from '@features/media/types/media.types'

/** Lo que devuelve `GET /species`: sin rangos. */
export interface SpeciesSummary {
  id: string
  /** El código de inventario (`CAT-GRUSS`): prefijo del de cada uno de sus ejemplares. */
  code: string
  scientificName: string
  commonName: string
  /** La portada, ausente si la especie no tiene fotografías (T-19). */
  primaryPhoto?: PhotoSummary
  photoCount?: number
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

/** Cómo recibe la luz la especie. La definición funcional de cada valor está en `speciesCultivation`. */
export type SunExposure = 'sombra' | 'semisombra' | 'soleado' | 'pleno_sol'

/** Dónde se cultiva. La estacionalidad la dice el calendario, no un cuarto valor. */
export type Environment = 'interior' | 'exterior' | 'ambos'

/** `crecimiento_maximo` se superpone al crecimiento —cuándo más crece— y cae siempre dentro de él. */
export type PeriodType = 'crecimiento' | 'crecimiento_maximo' | 'reposo' | 'floracion' | 'riego'

/** Solo el riego la lleva. */
export type WateringIntensity = 'escaso' | 'moderado' | 'abundante'

/** Un periodo del año. Un inicio posterior al fin cruza el fin de año (noviembre–febrero = 11→2). */
export interface SpeciesPeriod {
  id: string
  type: PeriodType
  startMonth: number
  endMonth: number
  intensity: WateringIntensity | null
  notes: string | null
}

/** El periodo tal y como se envía: sin identidad. */
export type SpeciesPeriodInput = Omit<SpeciesPeriod, 'id'>

/**
 * Lo que devuelve `GET /species/{id}`: la ficha más **cuántos ejemplares tiene**, que decide si el
 * código se puede corregir. No viaja dentro de `GET /plants/{id}`, donde no tendría sentido.
 */
export interface SpeciesDetail extends SpeciesCare {
  plantCount: number
  description: string | null
  sunExposure: SunExposure | null
  environment: Environment | null
  bloomDescription: string | null
  bloomColor: string | null
  bloomMaturity: string | null
  bloomTypicalDuration: string | null
  /** Siempre presente; vacía si la especie no tiene calendario. */
  periods: SpeciesPeriod[]
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
  description?: string | null
  sunExposure?: SunExposure | null
  environment?: Environment | null
  bloomDescription?: string | null
  bloomColor?: string | null
  bloomMaturity?: string | null
  bloomTypicalDuration?: string | null
  /** Reemplaza el calendario guardado: omitirlo lo vacía. */
  periods?: SpeciesPeriodInput[]
}
