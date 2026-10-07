import type { LocationDetail, LocationInput } from '../types/location.types'

/** El formulario de alta de partida; `parentId` viene de «Añadir dentro» cuando lo hay. */
export function emptyLocationInput(parentId: string | null = null): LocationInput {
  return {
    name: '',
    code: '',
    parentId,
    description: '',
    locationType: null,
    capacity: null,
    operationalNotes: '',
    environment: null,
    sunExposure: null,
  }
}

/**
 * La ficha como cuerpo de la corrección, tal cual: el `PUT` es reemplazo completo, así que omitir
 * algo lo dejaría sin definir. Por eso parte de **todo** lo guardado.
 */
export function locationToInput(detail: LocationDetail): LocationInput {
  return {
    name: detail.name,
    code: detail.code,
    parentId: detail.parentId,
    description: detail.description ?? '',
    locationType: detail.locationType,
    capacity: detail.capacity,
    operationalNotes: detail.operationalNotes ?? '',
    environment: detail.environment,
    sunExposure: detail.sunExposure,
  }
}

/** Ocupación en porcentaje entero, o `null` cuando no hay capacidad: sin ella no se inventa una proporción. */
export function occupancyOf(total: number, capacity: number | null): number | null {
  return capacity && capacity > 0 ? Math.round((total / capacity) * 100) : null
}
