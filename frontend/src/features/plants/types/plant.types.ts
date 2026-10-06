import type { Location, Tag } from '@features/catalogs/types/catalog.types'
import type { SpeciesCare, SpeciesSummary } from '@features/species/types/species.types'

/** El inventario. Todo identificador es `string`: son TSID por encima de `2^53` (ADR-008). */

export interface PlantSummary {
  id: string
  /** El código de inventario (`CAT-GRUSS-01`): se asigna al dar de alta y no cambia nunca. */
  code: string
  nickname: string
  createdAt: string | null
  location: Location
  species: SpeciesSummary
}

export interface PlantDetail {
  id: string
  code: string
  nickname: string
  createdAt: string | null
  location: Location
  species: SpeciesCare
  tags: Tag[]
}
