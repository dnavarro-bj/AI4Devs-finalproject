import type { Location, Tag } from '@features/catalogs/types/catalog.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'

/** El inventario. Todo identificador es `string`: son TSID por encima de `2^53` (ADR-008). */

/** Tres en curso y cuatro finales: un estado final no hace desaparecer el ejemplar. */
export type PlantStatus = 'activa' | 'cuarentena' | 'enferma' | 'cedida' | 'vendida' | 'muerta' | 'perdida'

export type PlantOrigin = 'vivero' | 'intercambio' | 'germinacion_propia' | 'compra' | 'regalo' | 'otro'

/**
 * Lo opcional de la ficha. El API **omite** lo ausente, así que cada campo puede faltar; al enviar,
 * `null` o ausente significan lo mismo: la edición es reemplazo completo.
 */
export interface PlantProfile {
  description?: string | null
  germinationYear?: number | null
  /** Solo tiene sentido con año: el servidor rechaza un mes sin año. */
  germinationMonth?: number | null
  /** `YYYY-MM-DD`. */
  acquiredOn?: string | null
  origin?: PlantOrigin | null
  originNote?: string | null
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
}

/** Un cambio de estado del historial, del más reciente al más antiguo. */
export interface PlantStatusChange {
  id: string
  fromStatus: PlantStatus
  toStatus: PlantStatus
  reason?: string
  occurredAt: string
}
