/**
 * El contrato publicado del API, en un solo sitio (decisión 5 del design).
 *
 * **Todo identificador es `string`.** Son TSID por encima de `2^53`; tipados como `number` se
 * corromperían en silencio, y el tipo es la única barrera que lo impide (ADR-008). Ningún punto
 * del cliente hace `Number(id)` ni aritmética sobre un identificador.
 */

/** Envelope de todos los listados del API (ADR-009). */
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  pageNumber: number
  pageSize: number
}

export interface Location {
  id: string
  name: string
}

export interface Tag {
  id: string
  name: string
}

/** Lo que devuelve `GET /species`: sin rangos. */
export interface SpeciesSummary {
  id: string
  scientificName: string
  commonName: string
}

/**
 * Lo que devuelve `GET /species/{id}`, y lo que viaja dentro de `GET /plants/{id}`. Los rangos
 * solo están aquí: el listado del catálogo no los trae (decisión 1 del design).
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

export interface PlantSummary {
  id: string
  nickname: string
  createdAt: string | null
  location: Location
  species: SpeciesSummary
}

export interface PlantDetail {
  id: string
  nickname: string
  createdAt: string | null
  location: Location
  species: SpeciesCare
  tags: Tag[]
}

/** Los `CHECK` de `V5__ai_recommendation_constraints.sql` garantizan estos valores. */
export type RiskLevel = 'low' | 'medium' | 'high'
export type Priority = 'immediate' | 'soon' | 'routine'

export interface Recommendation {
  id: string
  careRecordId: string
  riskLevel: RiskLevel
  explanation: string
  recommendedAction: string
  priority: Priority
  createdAt: string | null
}

/**
 * Los cinco valores son opcionales por separado, y el API **omite** los que no se informaron en
 * lugar de mandarlos a `null`: llegan como `undefined`. Quien los pinte debe comprobar ambos.
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

/** Cuerpo de error uniforme del API. */
export interface ApiErrorBody {
  status: number
  error: string
  message: string
  path: string
}

/** Lo que la aplicación maneja: siempre con un `message` pintable. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
