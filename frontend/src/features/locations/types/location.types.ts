/**
 * Las localizaciones y sus movimientos. Todo identificador es `string` (ADR-008).
 *
 * La jerarquía es `parentId`; **la ruta y los recuentos los calcula el API** (decisión 1 del change
 * `localizaciones-jerarquicas`): el frontend nunca los mantiene, solo los pinta.
 */

/** La referencia mínima a una localización: lo que otras entidades llevan embebido. */
export interface Location {
  id: string
  name: string
}

export type LocationType = 'bancada' | 'bandeja' | 'invernadero' | 'zona_exterior' | 'estanteria' | 'otro'
export type LocationEnvironment = 'interior' | 'cubierto' | 'exterior'
export type LocationExposure = 'sombra' | 'semisombra' | 'soleado' | 'pleno_sol'

/**
 * Una fila del catálogo. `path` incluye la propia localización («Invernadero 1 / Bancada norte»);
 * `plantCount` son los ejemplares directos y `plantCountTotal` cuenta también los descendientes.
 */
export interface LocationSummary extends Location {
  code: string
  parentId: string | null
  path: string
  locationType: LocationType | null
  capacity: number | null
  plantCount: number
  plantCountTotal: number
}

/** Un ancestro en la ruta de la ficha, de la raíz hacia abajo. */
export interface LocationAncestor extends Location {}

/** Una sublocalización directa, con su carga. */
export interface LocationChild extends Location {
  code: string
  locationType: LocationType | null
  plantCount: number
  plantCountTotal: number
}

export interface LocationDetail extends Location {
  code: string
  parentId: string | null
  description: string | null
  locationType: LocationType | null
  capacity: number | null
  operationalNotes: string | null
  environment: LocationEnvironment | null
  sunExposure: LocationExposure | null
  ancestors: LocationAncestor[]
  children: LocationChild[]
  plantCount: number
  plantCountTotal: number
}

/** El cuerpo del alta y de la corrección: el `PUT` es reemplazo completo. */
export interface LocationInput {
  name: string
  code: string
  parentId: string | null
  description: string
  locationType: LocationType | null
  capacity: number | null
  operationalNotes: string
  environment: LocationEnvironment | null
  sunExposure: LocationExposure | null
}

export interface LocationListQuery {
  page?: number
  sort?: string
  /** Los hijos directos de un nodo. */
  parentId?: string
  /** Solo las localizaciones sin padre. */
  root?: boolean
}

/** Un movimiento del historial, del más reciente al más antiguo. */
export interface PlantMovement {
  id: string
  plantId: string
  plantCode: string
  from: Location
  to: Location
  movedAt: string
}

/** Lo que deja un lote: cuántos cambiaron de sitio y cuántos ya estaban en el destino. */
export interface MoveResult {
  moved: number
  unchanged: number
}
