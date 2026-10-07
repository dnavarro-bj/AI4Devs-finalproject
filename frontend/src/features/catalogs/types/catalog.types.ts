/**
 * El catálogo de etiquetas. Las localizaciones tienen su propia feature (`@features/locations`).
 * Todo identificador es `string` (ADR-008).
 */

export interface Tag {
  id: string
  name: string
}

/**
 * La etiqueta en el catálogo: el nombre más cuántas plantas la tienen.
 *
 * El recuento viaja en el listado porque el catálogo existe para **comparar** usos —qué etiqueta
 * sobra y cuál duplica a cuál—, y eso no se puede hacer entrando en cada ficha.
 */
export interface TagListItem extends Tag {
  plantCount: number
}

/**
 * La etiqueta en su propia ficha: además, **su forma normalizada**, que es lo que decide si un
 * renombrado choca con otra. Enseñarla evita que un `409` parezca arbitrario.
 */
export interface TagDetail extends TagListItem {
  normalizedName: string
}

/** Lo que deja una combinación: la etiqueta que queda y a cuántas plantas alcanzó. */
export interface TagMergeResult {
  target: Tag
  affectedPlants: number
}
