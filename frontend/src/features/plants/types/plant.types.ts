import type { AlertSeverity, AlertSummary } from '@features/alerts/types/alert.types'
import type { Tag } from '@features/catalogs/types/catalog.types'
import type { Location } from '@features/locations/types/location.types'
import type { SoilMixSummary } from '@features/soil-mixes/types/soilMix.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'

/** El inventario. Todo identificador es `string`: son TSID por encima de `2^53` (ADR-008). */

/** Tres en curso y cuatro finales: un estado final no hace desaparecer el ejemplar. */
export type PlantStatus = 'activa' | 'cuarentena' | 'enferma' | 'cedida' | 'vendida' | 'muerta' | 'perdida'

export type PlantOrigin = 'vivero' | 'intercambio' | 'germinacion_propia' | 'compra' | 'regalo' | 'otro'

/**
 * Lo opcional de la ficha. El API **omite** lo ausente, así que cada campo puede faltar; al enviar,
 * `null` o ausente significan lo mismo: la edición es reemplazo completo.
 */
/**
 * Lo que un ejemplar **sobrescribe** de la pauta de su especie. Todo opcional: ausente significa
 * «hereda de la especie». La mezcla viaja por identificador.
 */
export interface PlantCareOverrides {
  minHumidity?: number | null
  maxHumidity?: number | null
  minTemperature?: number | null
  maxTemperature?: number | null
  minLightHours?: number | null
  maxLightHours?: number | null
  wateringGuideline?: string | null
  soilMixId?: string | null
}

/** El perfil que se aplica a un ejemplar, ya resuelto por el servidor, y qué campos se apartan de la especie. */
export interface EffectiveCare {
  minHumidity: number
  maxHumidity: number
  minTemperature: number
  maxTemperature: number
  minLightHours: number
  maxLightHours: number
  wateringGuideline: string
  soilMix: SoilMixSummary
  /** `minHumidity`, `maxTemperature`, `wateringGuideline`, `soilMix`… */
  overridden: string[]
}

export interface PlantProfile {
  description?: string | null
  germinationYear?: number | null
  /** Solo tiene sentido con año: el servidor rechaza un mes sin año. */
  germinationMonth?: number | null
  /** `YYYY-MM-DD`. */
  acquiredOn?: string | null
  origin?: PlantOrigin | null
  originNote?: string | null
  /** Reemplazo completo: sin él, el ejemplar vuelve a heredar toda la pauta de su especie. */
  careOverrides?: PlantCareOverrides | null
}

export interface PlantSummary {
  id: string
  /** El código de inventario (`CAT-GRUSS-01`): se asigna al dar de alta y no cambia nunca. */
  code: string
  status: PlantStatus
  nickname: string
  createdAt: string | null
  location: Location
  species: SpeciesSummary
  /** La mayor severidad entre sus alertas abiertas; ausente si no tiene ninguna. */
  attention?: AlertSeverity
}

export interface PlantDetail extends PlantProfile {
  id: string
  code: string
  status: PlantStatus
  nickname: string
  createdAt: string | null
  location: Location
  species: SpeciesCare
  tags: Tag[]
  /** El perfil que se aplica: lo propio donde lo hay, lo de la especie donde no. */
  effectiveCare: EffectiveCare
  /** Sus alertas abiertas, de la más grave a la más leve. */
  openAlerts?: AlertSummary[]
}

/** Un cambio de estado del historial, del más reciente al más antiguo. */
export interface PlantStatusChange {
  id: string
  fromStatus: PlantStatus
  toStatus: PlantStatus
  reason?: string
  occurredAt: string
}
