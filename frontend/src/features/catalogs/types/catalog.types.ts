/** Los catálogos que pueblan los formularios. Todo identificador es `string` (ADR-008). */

export interface Location {
  id: string
  name: string
}

/**
 * La localización en el catálogo: el nombre más la carga que soporta.
 *
 * El recuento viaja en el listado —no solo en la ficha, como en mezclas— porque el mapa del vivero
 * **es** la carga de cada sitio. El API lo resuelve con una agregación para la página entera.
 */
export interface LocationListItem extends Location {
  plantCount: number
}

/**
 * La localización en su propia ficha: el nombre más **cuántos ejemplares alberga**.
 *
 * El recuento solo viaja en la ficha, igual que en mezclas: en el catálogo sería una consulta por
 * fila, y aquí es la cifra que decide si la localización se puede retirar.
 */
export interface LocationDetail extends Location {
  plantCount: number
}

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
